import { CityView, cityMetadata } from "@/components/city/CityView";

export const metadata = cityMetadata("oslo");

export default function Page() {
  return <CityView slug="oslo" />;
}
