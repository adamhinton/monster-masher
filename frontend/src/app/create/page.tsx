import { CreateMonsterExperience } from "@/components/monsterGeneration/CreateMonsterExperience";
import { PageContainer } from "@/components/layout/PageContainer";

export const metadata = { title: "Create a Monster" };

/**
 * /create
 *
 * Here the user creates their monster.
 */
export default function CreatePage() {
	return (
		<PageContainer size="form">
			<CreateMonsterExperience />
		</PageContainer>
	);
}
