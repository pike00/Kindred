import { describe, expect, it } from "vitest"
import type { ContactPublic } from "@/client"
import {
  cleanTranscriptionText,
  detectChannel,
  identifyAttendees,
  parseVoiceTranscription,
} from "@/components/VoiceRecorder/parseVoiceTranscription"

const mockContacts: ContactPublic[] = [
  {
    id: "id-nora",
    first_name: "Nora",
    last_name: "Taylor",
    owner_id: "owner-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "id-lucas",
    first_name: "Lucas",
    last_name: "Maeda",
    owner_id: "owner-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "id-yara",
    first_name: "Yara",
    last_name: "Vasquez",
    owner_id: "owner-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "id-satoshi",
    first_name: "Satoshi",
    last_name: "Lee",
    owner_id: "owner-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
]

describe("parseVoiceTranscription", () => {
  describe("identifyAttendees", () => {
    it("identifies full name matches", () => {
      const text = "at that I called Nora Taylor and followed up with her about X, Y, Z"
      const { matchedIds, matchedNames } = identifyAttendees(text, mockContacts)

      expect(matchedIds).toEqual(["id-nora"])
      expect(matchedNames).toEqual(["Nora Taylor"])
    })

    it("identifies unique first name matches", () => {
      const text = "Spoke with Lucas about the upcoming release schedule"
      const { matchedIds } = identifyAttendees(text, mockContacts)

      expect(matchedIds).toEqual(["id-lucas"])
    })

    it("identifies multiple contacts in order of appearance", () => {
      const text = "Had lunch with Yara Vasquez and Nora Taylor to celebrate the launch"
      const { matchedIds } = identifyAttendees(text, mockContacts)

      expect(matchedIds).toEqual(["id-yara", "id-nora"])
    })

    it("returns empty array when no contact matches", () => {
      const text = "Discussed the new architecture proposals with the engineering team"
      const { matchedIds } = identifyAttendees(text, mockContacts)

      expect(matchedIds).toEqual([])
    })
  })

  describe("detectChannel", () => {
    it("detects phone call channel", () => {
      expect(detectChannel("I called Nora Taylor on the phone")).toBe("call")
      expect(detectChannel("spoke on the phone with Satoshi")).toBe("call")
      expect(detectChannel("gave a call to Lucas")).toBe("call")
    })

    it("detects text message channel", () => {
      expect(detectChannel("texted Yara about dinner tonight")).toBe("text")
      expect(detectChannel("sent a text message to Nora")).toBe("text")
      expect(detectChannel("messaged Satoshi on whatsapp")).toBe("text")
    })

    it("detects email channel", () => {
      expect(detectChannel("emailed Lucas the proposal document")).toBe("email")
      expect(detectChannel("sent an email regarding the contract")).toBe("email")
    })

    it("detects video call channel", () => {
      expect(detectChannel("zoomed with Nora for 30 minutes")).toBe("video")
      expect(detectChannel("had a google meet with Lucas")).toBe("video")
      expect(detectChannel("facetimed Satoshi")).toBe("video")
    })

    it("detects in-person channel", () => {
      expect(detectChannel("had coffee with Nora")).toBe("in_person")
      expect(detectChannel("had lunch with Lucas")).toBe("in_person")
      expect(detectChannel("met up with Yara in person")).toBe("in_person")
    })
  })

  describe("cleanTranscriptionText", () => {
    it("cleans preamble and filler words for 'I called [Name] and...'", () => {
      const raw = "at that I called Nora Taylor and followed up with her about X, Y, Z"
      const cleaned = cleanTranscriptionText(raw, ["Nora Taylor"])

      expect(cleaned).toBe("Followed up with her about X, Y, Z.")
    })

    it("cleans preamble for 'I met with [Name] to discuss...'", () => {
      const raw = "so um I met with Lucas Maeda to discuss the Q3 roadmap"
      const cleaned = cleanTranscriptionText(raw, ["Lucas Maeda"])

      expect(cleaned).toBe("Discuss the Q3 roadmap.")
    })

    it("preserves standalone note text without preambles while stripping fillers", () => {
      const raw = "uh just reviewed the feedback notes and agreed on next steps"
      const cleaned = cleanTranscriptionText(raw, [])

      expect(cleaned).toBe("Reviewed the feedback notes and agreed on next steps.")
    })
  })

  describe("full parseVoiceTranscription integration", () => {
    it("correctly parses the user voice note from screenshot", () => {
      const raw = "at that I called Nora Taylor and followed up with her about X, Y, Z"
      const result = parseVoiceTranscription(raw, mockContacts)

      expect(result.matchedAttendeeIds).toEqual(["id-nora"])
      expect(result.detectedChannel).toBe("call")
      expect(result.cleanedNotes).toBe("Followed up with her about X, Y, Z.")
    })
  })
})
