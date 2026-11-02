/** Word-level diff (LCS) for comparing two answer versions. */
export type DiffPart = { text: string; kind: "same" | "added" | "removed" };

export function wordDiff(a: string, b: string): DiffPart[] {
  const A = a.split(/(\s+)/).filter(Boolean);
  const B = b.split(/(\s+)/).filter(Boolean);
  if (A.length * B.length > 4_000_000) return [{ text: a, kind: "removed" }, { text: b, kind: "added" }];
  const dp: number[][] = Array.from({ length: A.length + 1 }, () => new Array<number>(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (text: string, kind: DiffPart["kind"]) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) (push(A[i], "same"), i++, j++);
    else if (dp[i + 1][j] >= dp[i][j + 1]) push(A[i++], "removed");
    else push(B[j++], "added");
  }
  while (i < A.length) push(A[i++], "removed");
  while (j < B.length) push(B[j++], "added");
  return out;
}
