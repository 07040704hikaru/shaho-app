// TODO: Implement trip detail route.
import { notFound } from "next/navigation";
import { TripExperience } from "@/components/TripExperience";
import { getTripPlan } from "@/data/tripPlan";


interface TripPageProps {
  params: { slug: string };
}

export default async function TripPage({ params }: TripPageProps) {
  const tripPlan = await getTripPlan(params.slug);

  if(!tripPlan){    
    notFound();
  } 

  return (
  <main className="page">
    <TripExperience plan={tripPlan} />
  </main>
);
}
