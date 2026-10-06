import { AccountSettings } from "../../components/AccountSettings";
import { useDashboard } from "../DashboardContext";

export default function AccountPage() {
  const { setAvatarUrl } = useDashboard();
  return <AccountSettings onAvatarChange={setAvatarUrl} />;
}
