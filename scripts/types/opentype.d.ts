declare module 'opentype.js' {
  const opentype: {
    parse(buf: ArrayBuffer): {
      unitsPerEm: number;
      tables: { cmap: { glyphIndexMap: Record<string, number> } };
      glyphs: { get(i: number): { advanceWidth?: number } };
    };
  };
  export default opentype;
}
