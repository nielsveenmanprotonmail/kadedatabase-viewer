import { LocationForm } from "@/components/location-form";

// Next.js 16: `params` is een Promise en moet ge-await'd worden.
export default async function BewerkRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LocationForm id={id} />;
}
