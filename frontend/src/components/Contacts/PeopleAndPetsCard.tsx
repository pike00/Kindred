import { PetsCard } from "@/components/Contacts/PetsCard"
import { RelationshipsCard } from "@/components/Contacts/RelationshipsCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function PeopleAndPetsCard({
  contactId,
  contactName,
}: {
  contactId: string
  contactName: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>People & Pets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RelationshipsCard
          contactId={contactId}
          contactName={contactName}
          embedded
        />
        <div className="border-t pt-6">
          <PetsCard contactId={contactId} embedded />
        </div>
      </CardContent>
    </Card>
  )
}
