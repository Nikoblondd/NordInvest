import { CityView, cityMetadata } from "@/components/city/CityView";

export const metadata = cityMetadata("stockholm");

export default function Page() {
  return <CityView slug="stockholm" />;
}
