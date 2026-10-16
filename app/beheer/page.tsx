import { BeheerList } from "@/components/beheer-list";

export default function BeheerPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-navy-deep">Records beheren</h2>
        <p className="text-sm text-navy/50 mt-0.5">
          Zoek een locatie om te bewerken, of voeg een nieuw record toe.
        </p>
      </div>
      <BeheerList />
    </div>
  );
}
