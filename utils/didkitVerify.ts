import * as DIDKit from "@spruceid/didkit-wasm-node";
import { ethers } from "ethers";
import * as fs from "fs";

async function verifyCredentialWithEthers(signedCredential: any) {
  // domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, any>, signature: SignatureLike
  const standardizedTypes = signedCredential.proof.eip712Domain.types;
  const domain = signedCredential.proof.eip712Domain.domain;

  console.log("===============");
  console.log("standardizedTypes: ", standardizedTypes);
  console.log("===============");
  console.log("signedCredential: ", signedCredential);
  console.log("===============");
  console.log("proof           : ", signedCredential.proof.proofValue);
  console.log("===============");

  // Delete EIP712Domain so that ethers does not complain about the ambiguous primary type
  delete standardizedTypes.EIP712Domain;

  const signerAddress = ethers.utils.verifyTypedData(
    domain,
    standardizedTypes,
    signedCredential,
    signedCredential.proof.proofValue,
  );

  const signerIssuedCredential = signerAddress.toLowerCase() === signedCredential.issuer.split(":").pop();
  console.log("===============");
  console.log("signerAddress: ", signerAddress);
  console.log("expected     : ", signedCredential.issuer.split(":").pop());
  console.log("===============");

  if (signerIssuedCredential) {
    console.log("===============");
    console.log("!!! This credential was signed by the issuer: ", signerAddress);
    console.log("===============");

    const splitSignature = ethers.utils.splitSignature(signedCredential.proof.proofValue);
    return splitSignature;
  }
}

export async function verifyCredentialFromFile(filename: string) {
  // Read the JSON file
  const credentialData = fs.readFileSync(filename, "utf8");

  // Parse the JSON data into a JavaScript object
  const credential = JSON.parse(credentialData);

  console.log("===============");
  console.log(JSON.stringify(credential, undefined, 2));
  console.log("===============");
  verifyCredentialWithEthers(credential);

  const verifiation = await DIDKit.verifyCredential(
    JSON.stringify(credential, undefined, 2),
    JSON.stringify({
      proofPurpose: "assertionMethod",
    }),
  );
  console.log("===============");
  console.log(verifiation);
  console.log("===============");
}

// Check if the command-line argument for the filename is provided
if (process.argv.length !== 3) {
  console.error("Usage: node loadNodes.js <filename>");
  process.exit(1);
}

// Get the filename from the command-line arguments
const jsonFilePath = process.argv[2];
console.log("jsonFilePath: ", jsonFilePath);

// eslint-disable-next-line @typescript-eslint/no-floating-promises
verifyCredentialFromFile(jsonFilePath);
