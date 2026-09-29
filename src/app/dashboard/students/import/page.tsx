import { redirect } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { getSessionUser } from "@/lib/session"
import { can } from "@/lib/rbac"
import { listDepartments } from "@/db/queries/departments"
import { ImportClient } from "./client"

export const dynamic = "force-dynamic"

export default async function ImportStudentsPage() {
  // Server-side guard. The API re-checks too — this just avoids rendering the
  // page for someone who can't use it.
  const user = await getSessionUser()
  if (!user || !can(user, "student:update")) redirect("/dashboard")

  // Offered for rows whose roll number names no department: the roll map covers
  // only the CS-family branches, so for any other the importer has to say.
  // Scoped the way the syllabus and faculty importers scope theirs.
  const all = await listDepartments()
  const scope =
    user.tier === "super_admin"
      ? all.filter((d) => d.isActive).map((d) => d.code)
      : user.deptCodes
  const departments = all
    .filter((d) => scope.includes(d.code))
    .map((d) => ({ code: d.code, name: d.name }))

  return (
    <>
      <PageHeader
        title="Import roster"
        parent="Students"
        parentHref="/dashboard/students"
      />
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <ImportClient departments={departments} />
      </div>
    </>
  )
}
