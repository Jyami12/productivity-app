// Source descriptions and reuse terms checked on 2026-10-17.
export type ArtStyle = "sketch" | "archive";
export const SOURCED_ART: Record<
  string,
  {
    url: string;
    title: string;
    author: string;
    source: string;
    license: string;
    licenseUrl: string;
    note: string;
  }
> = {
  trex: {
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e4/T._rex_skeleton.svg",
    title: "T. rex skeleton",
    author: "American Museum Journal; vector extraction by Di (they-them)",
    source: "https://commons.wikimedia.org/wiki/File:T._rex_skeleton.svg",
    license: "Public domain",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    note: "Historical skeletal illustration.",
  },
  stegosaurus: {
    url: "https://upload.wikimedia.org/wikipedia/commons/c/c6/Stego-marsh-1896-US_geological_survey.png",
    title: "Stegosaurus ungulatus, 1896",
    author: "O. C. Marsh; Commons cleanup contributors",
    source:
      "https://commons.wikimedia.org/wiki/File:Stego-marsh-1896-US_geological_survey.png",
    license: "Public domain in the US",
    licenseUrl: "https://commons.wikimedia.org/wiki/Template:PD-US",
    note: "Historical illustration with outdated plate and tail-spike arrangement.",
  },
  triceratops: {
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f5/Triceratops_prorsus_old.jpg",
    title: "Triceratops prorsus, 1896",
    author: "O. C. Marsh",
    source:
      "https://commons.wikimedia.org/wiki/File:Triceratops_prorsus_old.jpg",
    license: "Public domain",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    note: "Historical illustration with outdated tail posture and fingers.",
  },
  brachiosaurus: {
    url: "https://upload.wikimedia.org/wikipedia/commons/7/77/Brachiosaurus_Composite_Skeletal.svg",
    title: "Brachiosaurus Composite Skeletal",
    author: "Slate Weasel",
    source:
      "https://commons.wikimedia.org/wiki/File:Brachiosaurus_Composite_Skeletal.svg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    note: "Composite skeletal diagram. Original specimen colors remain available at the source.",
  },
  spinosaurus: {
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Spinosaurus_skeleton.svg",
    title: "Spinosaurus skeleton",
    author: "Bugboy52.4",
    source: "https://commons.wikimedia.org/wiki/File:Spinosaurus_skeleton.svg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    note: "Older reconstruction with disputed proportions. Display adaptation remains CC BY-SA 3.0.",
  },
};
