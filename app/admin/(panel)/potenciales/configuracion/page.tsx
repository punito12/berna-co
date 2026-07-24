import ProspectConfigurationManager from "@/components/ProspectConfigurationManager";
import { getProspectConfiguration } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export default async function ProspectConfigurationPage() {
  const configuration = await getProspectConfiguration();
  return (
    <ProspectConfigurationManager
      initialRules={configuration.rules}
      queries={configuration.queries}
    />
  );
}

