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
 * A locked component says every student on the roster has that mark. Putting
 * somebody on the subject would make that untrue while it still reads as
 * finished, so the roster stays as the lock found it until the lock is
 * reopened.
 */
export function rosterFrozenReason(locked: Component[]): string | null {
  if (locked.length === 0) return null
  const names = locked.map((c) => LABEL[c]).join(", ")
  const one = locked.length === 1
  return `${names} ${one ? "is" : "are"} locked for this subject. Reopen ${one ? "it" : "them"} on the Marks tab before changing who takes it.`
}
