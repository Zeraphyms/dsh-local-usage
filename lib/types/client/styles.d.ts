/**
 * The panel's stylesheet, assembled from ordered fragments and injected once.
 *
 * The fragments are plain strings rather than CSS modules: a plugin served from
 * disk has to carry and inject its own sheet. Their order is the cascade order,
 * so `styles.ts` is the one place that lists them; each fragment owns one
 * surface and its section comment.
 *
 * @module dsh-local-usage/client/styles
 */
/** Element id marking this plugin's injected style tag. */
export declare const STYLE_ID = "dsh-local-usage/styles";
/** The complete stylesheet, in cascade order. */
export declare const styles: string;
