import { CityView, cityMetadata } from "@/components/city/CityView";

export const metadata = cityMetadata("koebenhavn");

export default function Page() {
  return <CityView slug="koebenhavn" />;
}
