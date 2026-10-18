export type FossilDefinition = {
    id: string;
    name: string;
    group: string;
    target: number;
    color: string;
  };
  
  // Original stylized SVG illustrations, not scientific reconstructions.
  // Targets are cumulative focus-minute milestones. Minutes are not spent.
  export const FOSSILS: FossilDefinition[] = [
    {
      id: "ammonite",
      name: "Ammonite",
      group: "Ocean collection",
      target: 15,
      color: "#ad794d",
    },
    {
      id: "trilobite",
      name: "Trilobite",
      group: "Ocean collection",
      target: 30,
      color: "#74876b",
    },
    {
      id: "stegosaurus",
      name: "Stegosaurus",
      group: "Dinosaur collection",
      target: 45,
      color: "#8c9568",
    },
    {
      id: "triceratops",
      name: "Triceratops",
      group: "Dinosaur collection",
      target: 60,
      color: "#ae8c65",
    },
    {
      id: "velociraptor",
      name: "Velociraptor",
      group: "Dinosaur collection",
      target: 90,
      color: "#8f8064",
    },
    {
      id: "trex",
      name: "Tyrannosaurus rex",
      group: "Dinosaur collection",
      target: 150,
      color: "#718b58",
    },
    {
      id: "brachiosaurus",
      name: "Brachiosaurus",
      group: "Dinosaur collection",
      target: 210,
      color: "#899d7a",
    },
    {
      id: "pteranodon",
      name: "Pteranodon",
      group: "Flying collection",
      target: 270,
      color: "#aa9575",
    },
    {
      id: "spinosaurus",
      name: "Spinosaurus",
      group: "Dinosaur collection",
      target: 360,
      color: "#9a856d",
    },
    {
      id: "ankylosaurus",
      name: "Ankylosaurus",
      group: "Dinosaur collection",
      target: 450,
      color: "#8e997c",
    },
    {
      id: "plesiosaurus",
      name: "Plesiosaurus",
      group: "Ocean collection",
      target: 600,
      color: "#75938b",
    },
    {
      id: "mammoth",
      name: "Mammoth",
      group: "Ice age collection",
      target: 750,
      color: "#a58a71",
    },
  ];
