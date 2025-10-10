import { TripExperience } from "@/components/TripExperience";
import { getTripPlan } from "@/data/tripPlan";

export default async function HomePage() {
  let plan = null;

  try {
    plan = await getTripPlan();
  } catch (error) {
    console.error("Failed to load trip plan from database", error);
    plan = null;
  }

  return (
    <main className="page">
      <TripExperience plan={plan} />
    </main>
  );
}
