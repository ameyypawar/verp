// Electives: subjects taught to part of a class.
//
// A class's roster is derived, never stored — its students are the ones whose
// roll number resolves to its class key. That is exactly right for a subject
// the whole division sits, and wrong for an elective: the division splits
// across several of them, and each is taught to the students who chose it.
// Measured against the class, an elective's marks grid listed everybody, and it
// could never be locked or published — locking waits for a mark from every
// student on the roster, and most of the class would never have one.
//
// Pure, so the rules can be tested without a database, and so every surface
// that asks "who is this subject taught to" gets one answer.

import type { MarksInput } from "@/lib/sgpi"
import type { Component } from "@/lib/marks-integrity"

const idOf = (s: string | { id: string }) => (typeof s === "string" ? s : s.id)

/**
 * The students a subject is taught to.
 *
 * The class for an ordinary subject. For an elective, the class narrowed to the
 * students put on it — narrowed, not replaced, so somebody who leaves the class
 * or is deactivated drops off the elective the way they drop off everything
 * else, and no enrolment can reach a student outside the class.
 */
export function offeringRoster<T extends string | { id: string }>(
  offering: { isElective: boolean },
  classRoster: readonly T[],
  enrolled: ReadonlySet<string>
): T[] {
  if (!offering.isElective) return [...classRoster]
  return classRoster.filter((s) => enrolled.has(idOf(s)))
}

/** Whether anything is recorded for a student in a subject, as opposed to a row existing. */
export function hasRecordedMark(row: MarksInput | undefined): boolean {
  if (!row) return false
  return (
    row.isa != null || row.mse1 != null || row.mse2 != null || row.ese != null
  )
}

/**
 * The students with at least one mark recorded in a subject.
 *
 * A row is not evidence: the grid saves every row it shows, so a subject taught
 * as whole-class has a row for everybody in the division. A value is — it is a
 * teacher marking that student in that subject.
 */
export function studentsWithMarks(
  marks: ReadonlyMap<string, MarksInput>
): string[] {
  return [...marks]
    .filter(([, row]) => hasRecordedMark(row))
    .map(([studentId]) => studentId)
}

const LABEL: Record<Component, string> = {
  isa: "ISA",
  mse: "MSE",
  ese: "ESE",
}

/**
 * Why a subject's roster cannot change right now, or null if it can.
 *
 * Published results were checked against the roster as it stood, and a locked
 * component says every student on the roster has that mark. Changing who takes
 * the subject under either would make that untrue while it still reads as
 * finished, so the roster stays put until the results are withdrawn and the
 * locks reopened. Reopening the locks alone does not unpublish.
 */
export function rosterFrozenReason(subject: {
  published: boolean
  locked: Component[]
}): string | null {
  if (subject.published) {
    return "Its results are published. Withdraw them on the Marks tab before changing who takes it."
  }
  if (subject.locked.length === 0) return null
  const names = subject.locked.map((c) => LABEL[c]).join(", ")
  const one = subject.locked.length === 1
  return `${names} ${one ? "is" : "are"} locked for this subject. Reopen ${one ? "it" : "them"} on the Marks tab before changing who takes it.`
}

/**
 * Why a subject with nobody on its roster cannot be locked or published.
 *
 * "Every student has this mark" is true of an empty list without anybody
 * having marked anything. That let an elective nobody had been put on yet be
 * locked and published — a result for nobody, behind a lock that then froze its
 * roster empty.
 */
export function emptyRosterMessage(
  isElective: boolean,
  action: "Lock" | "Publish"
): string {
  const verb = action.toLowerCase()
  return isElective
    ? `Nobody is taking this elective yet. Put its students on it on the Electives tab, then ${verb}.`
    : `This class has no students yet, so there is nothing to ${verb}.`
}
