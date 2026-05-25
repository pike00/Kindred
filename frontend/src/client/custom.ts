export type { ContactGeoPoint } from "./types.gen"
import type { ContactsListContactsGeoData, ContactsGeoResponse } from "./types.gen"
import { ContactsService } from "./sdk.gen"

export class CustomContactsService {
  static listContactsGeo(data: ContactsListContactsGeoData = {}): Promise<ContactsGeoResponse> {
    return ContactsService.listContactsGeo(data) as unknown as Promise<ContactsGeoResponse>
  }
}
