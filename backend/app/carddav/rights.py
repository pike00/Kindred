"""Custom Radicale rights module for CRM CardDAV access control.

Allows authenticated users to access their own collections.
"""


class Rights:
    """Grant access to authenticated users for their own collections."""

    def __init__(self, configuration: object) -> None:
        """Initialize the rights module."""
        pass

    def authorize(self, user: str, owner: str, collection: object,
                  permission: str) -> bool:
        """Check if the user is authorized for the given permission.

        Args:
            user: The authenticated user (email).
            owner: The owner of the collection.
            collection: The collection being accessed.
            permission: The permission being requested (e.g., "read", "write").

        Returns:
            True if authorized, False otherwise.
        """
        # Allow authenticated users to access their own principal and collections
        if user and user == owner:
            return True

        # Allow access to the root path for discovery
        if collection and getattr(collection, "path", None) == "":
            return True

        return False
