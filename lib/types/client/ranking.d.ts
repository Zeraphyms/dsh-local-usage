/**
 * The project ranking: which directories a window's tokens went to.
 *
 * The calendar answers *when* a profile spent. This answers *where*, over
 * whatever range the panel is currently showing — the same fold the summary
 * strip above it reads, so the two can never disagree about the window.
 *
 * Sorted by token volume rather than by cost, and the bar length is the share of
 * the leader rather than of the total: a bar scaled to the total makes the whole
 * ranking a row of slivers as soon as one project dominates, which is exactly
 * the case this list exists to make legible.
 *
 * @module dsh-local-usage/client/ranking
 */
import type { UsageProjectRow } from '../types.ts';
/** Ranked projects, largest token volume first. */
export declare function rankProjects(projects: readonly UsageProjectRow[]): UsageProjectRow[];
/**
 * How long a project's bar is, as a fraction of the leader's.
 * @param row - the project.
 * @param leader - the project with the highest token volume, or `undefined` for an empty window.
 * @returns a fraction in `[0, 1]`, or `undefined` when there is nothing to scale against.
 */
export declare function barFraction(row: UsageProjectRow, leader: UsageProjectRow | undefined): number | undefined;
