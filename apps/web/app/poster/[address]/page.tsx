import { ProfilePage } from "@/components/profile-page";

export default function PosterProfilePage({ params }: { params: { address: string } }) {
  return <ProfilePage kind="poster" address={params.address} />;
}
