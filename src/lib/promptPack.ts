import copilotInstructions from '../../.github/copilot-instructions.md?raw'
import crowdstrikeEdrStrategy from '../../.github/prompts/crowdstrike_edr_strategy.prompt.md?raw'
import crowdstrikeSiemRuleSkeleton from '../../.github/prompts/crowdstrike_siem_rule_skeleton.prompt.md?raw'
import crowdstrikeStrategy from '../../.github/prompts/crowdstrike_strategy.md?raw'
import exabeamCimAlignment from '../../.github/prompts/exabeam_cim_alignment.md?raw'
import exabeamCimAlignmentNotes from '../../.github/prompts/exabeam_cim_alignment_notes.prompt.md?raw'
import generateKqlFromObjective from '../../.github/prompts/generate_kql_from_objective.prompt.md?raw'
import generateSigmaFromObjective from '../../.github/prompts/generate_sigma_from_objective.prompt.md?raw'
import kqlFromObjective from '../../.github/prompts/kql_from_objective.md?raw'
import sigmaFromObjective from '../../.github/prompts/sigma_from_objective.md?raw'

export const promptPack: Record<string, string> = {
  '.github/copilot-instructions.md': copilotInstructions,
  '.github/prompts/crowdstrike_edr_strategy.prompt.md': crowdstrikeEdrStrategy,
  '.github/prompts/crowdstrike_siem_rule_skeleton.prompt.md': crowdstrikeSiemRuleSkeleton,
  '.github/prompts/crowdstrike_strategy.md': crowdstrikeStrategy,
  '.github/prompts/exabeam_cim_alignment.md': exabeamCimAlignment,
  '.github/prompts/exabeam_cim_alignment_notes.prompt.md': exabeamCimAlignmentNotes,
  '.github/prompts/generate_kql_from_objective.prompt.md': generateKqlFromObjective,
  '.github/prompts/generate_sigma_from_objective.prompt.md': generateSigmaFromObjective,
  '.github/prompts/kql_from_objective.md': kqlFromObjective,
  '.github/prompts/sigma_from_objective.md': sigmaFromObjective,
}

