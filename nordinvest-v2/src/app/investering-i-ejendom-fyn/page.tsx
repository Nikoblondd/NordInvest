import { CityView, cityMetadata } from "@/components/city/CityView";

export const metadata = cityMetadata("fyn");

export default function Page() {
  return <CityView slug="fyn" />;
}
