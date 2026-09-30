import { CityView, cityMetadata } from "@/components/city/CityView";

export const metadata = cityMetadata("aarhus");

export default function Page() {
  return <CityView slug="aarhus" />;
}
