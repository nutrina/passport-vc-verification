export * from "./eip712Types";

export type ExampleDocument = {
  "@context": string[];
  type: string[];
  credentialSubject: {
    id: string;
    hash: string;
    provider: string;
  };
};
