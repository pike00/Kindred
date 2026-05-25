"""vCard 3.0 parsing and generation utilities.

Converts between Contact/ContactField/Address database models and vCard format.
Preserves unknown vCard properties through round-trips by storing raw vCard text.
"""

import hashlib
import uuid

import vobject
from vobject.vcard import Address as VCardAddress
from vobject.vcard import Name

from app.models import (
    Address,
    Contact,
    ContactField,
    ContactFieldType,
)


def normalize_vcard_for_hash(vcard_text: str) -> str:
    """Normalize vCard text before hashing to ensure stable hashes.

    Normalization steps:
    1. Normalize line endings to LF (CRLF -> LF)
    2. Strip trailing whitespace from each line
    3. Sort properties (except BEGIN, END, VERSION, UID, REV which must stay in order)
    4. Remove empty lines

    This ensures that the same contact data produces the same hash
    regardless of which CardDAV client formatted the vCard.
    """
    lines = vcard_text.replace("\r\n", "\n").split("\n")

    # Strip trailing whitespace, remove empty lines
    stripped = [line.rstrip() for line in lines if line.strip()]

    # Separate ordered properties from sortable ones
    ordered_props = []  # BEGIN, VERSION, UID, REV stay in order
    sortable_props = []

    ordered_keys = {"BEGIN", "VERSION", "UID", "REV", "END"}

    for line in stripped:
        key = line.split(":")[0].split(";")[0].upper()
        if key in ordered_keys:
            ordered_props.append(line)
        else:
            sortable_props.append(line)

    # Sort sortable properties alphabetically by key then value
    sortable_props.sort()

    # Reconstruct: BEGIN, VERSION, UID, REV, sorted props, END
    result_parts = []
    begin_found = False
    version_found = False
    uid_found = False
    rev_found = False

    for line in ordered_props:
        key = line.split(":")[0].split(";")[0].upper()
        if key == "BEGIN" and not begin_found:
            result_parts.append(line)
            begin_found = True
        elif key == "VERSION" and begin_found and not version_found:
            result_parts.append(line)
            version_found = True
        elif key == "UID" and version_found and not uid_found:
            result_parts.append(line)
            uid_found = True
        elif key == "REV" and uid_found and not rev_found:
            result_parts.append(line)
            rev_found = True
        elif key == "END":
            # END goes at the very end, collect it separately
            pass

    # Add sorted properties
    result_parts.extend(sortable_props)

    # Add END
    for line in ordered_props:
        key = line.split(":")[0].split(";")[0].upper()
        if key == "END":
            result_parts.append(line)
            break

    return "\n".join(result_parts) + "\n"


def compute_vcard_hash(vcard_text: str) -> str:
    """Compute SHA-256 hash of normalized vCard text.

    Args:
        vcard_text: Raw vCard text.

    Returns:
        Hexadecimal SHA-256 hash string (64 characters).
    """
    normalized = normalize_vcard_for_hash(vcard_text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def contact_to_vcard(
    contact: Contact,
    fields: list[ContactField],
    addresses: list[Address],
) -> str:
    """Generate a vCard 3.0 string from a Contact and its related data.

    If contact.vcard_raw exists, parse it and update fields (preserving
    unknown Apple extensions). Otherwise, create a new vCard from scratch.
    """
    if contact.vcard_raw:
        try:
            card = vobject.readOne(contact.vcard_raw)
        except Exception:
            card = vobject.vCard()
    else:
        card = vobject.vCard()

    # N (structured name) — required
    card.add("n") if not hasattr(card, "n") else None
    card.n.value = Name(
        family=contact.last_name or "",
        given=contact.first_name or "",
        additional=contact.middle_name or "",
        prefix=contact.prefix or "",
        suffix=contact.suffix or "",
    )

    # FN (formatted name) — required
    fn_parts = [
        contact.prefix,
        contact.first_name,
        contact.middle_name,
        contact.last_name,
        contact.suffix,
    ]
    fn = " ".join(p for p in fn_parts if p).strip()
    if hasattr(card, "fn"):
        card.fn.value = fn
    else:
        card.add("fn").value = fn

    # ORG
    if contact.company:
        org_value = [contact.company]
        if contact.department:
            org_value.append(contact.department)
        if hasattr(card, "org"):
            card.org.value = org_value
        else:
            card.add("org").value = org_value
    elif hasattr(card, "org"):
        card.remove(card.org)

    # TITLE
    if contact.title:
        if hasattr(card, "title"):
            card.title.value = contact.title
        else:
            card.add("title").value = contact.title
    elif hasattr(card, "title"):
        card.remove(card.title)

    # BDAY
    if contact.birthday:
        bday_str = contact.birthday.isoformat()
        if hasattr(card, "bday"):
            card.bday.value = bday_str
        else:
            card.add("bday").value = bday_str
    elif hasattr(card, "bday"):
        card.remove(card.bday)

    # NICKNAME
    if contact.nickname:
        if hasattr(card, "nickname"):
            card.nickname.value = contact.nickname
        else:
            card.add("nickname").value = contact.nickname
    elif hasattr(card, "nickname"):
        card.remove(card.nickname)

    # NOTE (maps to how_we_met in CRM)
    if contact.how_we_met:
        if hasattr(card, "note"):
            card.note.value = contact.how_we_met
        else:
            card.add("note").value = contact.how_we_met
    elif hasattr(card, "note"):
        card.remove(card.note)

    # PHOTO (avatar_url)
    if contact.avatar_url:
        if hasattr(card, "photo"):
            card.photo.value = contact.avatar_url
            card.photo.params["VALUE"] = ["URI"]
        else:
            photo = card.add("photo")
            photo.value = contact.avatar_url
            photo.params["VALUE"] = ["URI"]
    elif hasattr(card, "photo"):
        card.remove(card.photo)
        card.remove(card.bday)

    # UID
    uid_str = str(contact.id)
    if hasattr(card, "uid"):
        card.uid.value = uid_str
    else:
        card.add("uid").value = uid_str

    # REV
    rev_str = contact.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ")
    if hasattr(card, "rev"):
        card.rev.value = rev_str
    else:
        card.add("rev").value = rev_str

    # ─── CRM-specific X-properties (preserved through round-trips) ─────
    # These are ignored by standard CardDAV clients but preserved for CRM use

    # X-CRM-FAVORITE
    if contact.is_favorite:
        if "x-crm-favorite" in card.contents:
            card.contents["x-crm-favorite"][0].value = "TRUE"
        else:
            card.add("x-crm-favorite").value = "TRUE"
    elif "x-crm-favorite" in card.contents:
        del card.contents["x-crm-favorite"]

    # X-CRM-STAGE
    if contact.stage:
        if "x-crm-stage" in card.contents:
            card.contents["x-crm-stage"][0].value = contact.stage
        else:
            card.add("x-crm-stage").value = contact.stage
    elif "x-crm-stage" in card.contents:
        del card.contents["x-crm-stage"]

    # X-CRM-FREQUENCY-DAYS
    if contact.contact_frequency_days:
        if "x-crm-frequency-days" in card.contents:
            card.contents["x-crm-frequency-days"][0].value = str(
                contact.contact_frequency_days
            )
        else:
            card.add("x-crm-frequency-days").value = str(contact.contact_frequency_days)
    elif "x-crm-frequency-days" in card.contents:
        del card.contents["x-crm-frequency-days"]

    # X-CRM-ARCHIVED
    if contact.is_archived:
        if "x-crm-archived" in card.contents:
            card.contents["x-crm-archived"][0].value = "TRUE"
        else:
            card.add("x-crm-archived").value = "TRUE"
    elif "x-crm-archived" in card.contents:
        del card.contents["x-crm-archived"]

    # X-CRM-DECEASED
    if contact.is_deceased:
        if "x-crm-deceased" in card.contents:
            card.contents["x-crm-deceased"][0].value = "TRUE"
        else:
            card.add("x-crm-deceased").value = "TRUE"
    elif "x-crm-deceased" in card.contents:
        del card.contents["x-crm-deceased"]

    # X-CRM-DECEASED-AT
    if contact.deceased_at:
        if "x-crm-deceased-at" in card.contents:
            card.contents["x-crm-deceased-at"][
                0
            ].value = contact.deceased_at.isoformat()
        else:
            card.add("x-crm-deceased-at").value = contact.deceased_at.isoformat()
    elif "x-crm-deceased-at" in card.contents:
        del card.contents["x-crm-deceased-at"]

    # ─── Multi-value fields: TEL, EMAIL ───────────────────────────────────
    # Remove existing TEL, EMAIL entries (we regenerate from DB)
    for prop_name in ("tel", "email"):
        if prop_name in card.contents:
            for entry in list(card.contents[prop_name]):
                card.remove(entry)

    for field in fields:
        if field.field_type == ContactFieldType.PHONE:
            tel = card.add("tel")
            tel.value = field.value
            tel.params["TYPE"] = [field.label.upper()]
        elif field.field_type == ContactFieldType.EMAIL:
            email = card.add("email")
            email.value = field.value
            email.params["TYPE"] = [field.label.upper()]

    # ─── Addresses ────────────────────────────────────────────────────────
    if "adr" in card.contents:
        for entry in list(card.contents["adr"]):
            card.remove(entry)

    for addr in addresses:
        adr = card.add("adr")
        adr.value = VCardAddress(
            box="",
            extended=addr.extended or "",
            street=addr.street or "",
            city=addr.city or "",
            region=addr.region or "",
            code=addr.postal_code or "",
            country=addr.country or "",
        )
        adr.params["TYPE"] = [addr.label.upper()]

    return card.serialize()
    vcard_text = card.serialize()
    return vcard_text, compute_vcard_hash(vcard_text)


def vcard_to_contact_data(vcard_text: str) -> dict:
    """Parse a vCard string and return a dict of Contact fields + related data.

    Returns:
        {
            "contact": { ... ContactCreate-compatible dict ... },
            "fields": [ { ... ContactFieldCreate-compatible dicts ... } ],
            "addresses": [ { ... AddressCreate-compatible dicts ... } ],
            "vcard_raw": "original vcard text",
            "uid": UUID or None,
        }
    """
    card = vobject.readOne(vcard_text)

    contact = {}

    # N
    if hasattr(card, "n"):
        contact["first_name"] = card.n.value.given or ""
        contact["last_name"] = card.n.value.family or None
        contact["middle_name"] = card.n.value.additional or None
        contact["prefix"] = card.n.value.prefix or None
        contact["suffix"] = card.n.value.suffix or None
    elif hasattr(card, "fn"):
        # Fallback: use FN as first_name
        contact["first_name"] = card.fn.value
    else:
        contact["first_name"] = "Unknown"

    # ORG
    if hasattr(card, "org"):
        org = card.org.value
        contact["company"] = org[0] if len(org) > 0 else None
        contact["department"] = org[1] if len(org) > 1 else None

    # TITLE
    if hasattr(card, "title"):
        contact["title"] = card.title.value

    # BDAY
    if hasattr(card, "bday"):
        try:
            from dateutil.parser import parse as dateparse

            contact["birthday"] = dateparse(card.bday.value).date()
        except Exception:
            pass

    # NICKNAME
    if hasattr(card, "nickname"):
        contact["nickname"] = card.nickname.value

    # NOTE (maps to how_we_met in CRM)
    if hasattr(card, "note"):
        contact["how_we_met"] = card.note.value

    # PHOTO (maps to avatar_url in CRM)
    if hasattr(card, "photo"):
        photo_value = card.photo.value
        # Handle both URI and binary photo data
        if isinstance(photo_value, str) and (
            photo_value.startswith("http://")
            or photo_value.startswith("https://")
            or photo_value.startswith("data:")
        ):
            contact["avatar_url"] = photo_value

    # X-CRM-* properties
    # is_favorite
    if "x-crm-favorite" in card.contents:
        contact["is_favorite"] = (
            card.contents["x-crm-favorite"][0].value.upper() == "TRUE"
        )

    # stage
    if "x-crm-stage" in card.contents:
        contact["stage"] = card.contents["x-crm-stage"][0].value

    # contact_frequency_days
    if "x-crm-frequency-days" in card.contents:
        try:
            contact["contact_frequency_days"] = int(
                card.contents["x-crm-frequency-days"][0].value
            )
        except (ValueError, TypeError):
            pass

    # is_archived
    if "x-crm-archived" in card.contents:
        contact["is_archived"] = (
            card.contents["x-crm-archived"][0].value.upper() == "TRUE"
        )

    # is_deceased
    if "x-crm-deceased" in card.contents:
        contact["is_deceased"] = (
            card.contents["x-crm-deceased"][0].value.upper() == "TRUE"
        )

    # deceased_at
    if "x-crm-deceased-at" in card.contents:
        try:
            from dateutil.parser import parse as dateparse

            contact["deceased_at"] = dateparse(
                card.contents["x-crm-deceased-at"][0].value
            ).date()
        except Exception:
            pass

    uid = None
    if hasattr(card, "uid"):
        uid_val = card.uid.value
        try:
            uid = uuid.UUID(uid_val.replace("urn:uuid:", ""))
        except ValueError:
            pass

    # ─── Contact fields ───────────────────────────────────────────────────
    fields = []

    # TEL
    for tel in getattr(card, "tel_list", []):
        types = tel.params.get("TYPE", ["other"])
        label = types[0].lower() if types else "other"
        fields.append(
            {
                "field_type": "phone",
                "label": label,
                "value": tel.value,
                "is_primary": "pref" in [t.lower() for t in types],
            }
        )

    # EMAIL
    for email in getattr(card, "email_list", []):
        types = email.params.get("TYPE", ["other"])
        label = types[0].lower() if types else "other"
        fields.append(
            {
                "field_type": "email",
                "label": label,
                "value": email.value,
                "is_primary": "pref" in [t.lower() for t in types],
            }
        )

    # ─── Addresses ────────────────────────────────────────────────────────
    addresses = []
    for adr in getattr(card, "adr_list", []):
        types = adr.params.get("TYPE", ["home"])
        label = types[0].lower() if types else "home"
        addresses.append(
            {
                "label": label,
                "street": adr.value.street or None,
                "extended": adr.value.extended or None,
                "city": adr.value.city or None,
                "region": adr.value.region or None,
                "postal_code": adr.value.code or None,
                "country": adr.value.country or None,
            }
        )

    return {
        "contact": contact,
        "fields": fields,
        "addresses": addresses,
        "vcard_raw": vcard_text,
        "uid": uid,
        "vcard_sha256": compute_vcard_hash(vcard_text),
    }
