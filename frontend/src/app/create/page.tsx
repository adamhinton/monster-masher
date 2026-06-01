import { CreateMonsterExperience } from "@/components/monsterGeneration/CreateMonsterExperience";
import { PageContainer } from "@/components/layout/PageContainer";

export const metadata = { title: "Create a Monster" };

/**
 * /create
 *
 * Here the user creates their monster.
 * Unauthenticated users see a sign-up prompt — handled inside CreateMonsterExperience.
 */
export default function CreatePage() {
	return (
		<PageContainer size="form">
			<CreateMonsterExperience />
		</PageContainer>
	);
}
