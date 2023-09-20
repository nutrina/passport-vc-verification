import * as DIDKit from "@spruceid/didkit-wasm-node";
import { ethers } from "ethers";

const JWK = JSON.stringify({
  kty: "EC",
  crv: "secp256k1",
  x: "ZPtNh7BFWk8YzFVBysUJ3kW8lT9RBBS7oQao8SZhsas",
  y: "KTikFckCaj64QnTrKi8QwqCO1oDXAcq4aHnTe3r07os",
  d: "mYFX2Z9HEZseQ89gHbAVF9bZVBV-cSX6mPhjXTyJFeo",
});

const did = DIDKit.keyToDID("ethr", JWK);

const credentialInput = {
  type: ["VerifiableCredential"],
  "@context": ["https://www.w3.org/2018/credentials/v1", "https://w3id.org/vc/status-list/2021/v1"],
  issuanceDate: "2022-07-19T10:42:24.883Z",
  expirationDate: "2022-10-17T10:42:24.883Z",
  issuer: did,
  credentialSubject: {
    "@context": {
      hash: "https://schema.org/Text",
      provider: "https://schema.org/Text",
      metaPointer: "https://schema.org/URL",
      // customInfo: "https://schema.org/Thing",
    },
    id: "did:pkh:eip155:1:0x12FeD9f987bc340c6bE43fD80aD641E8cD740682",
    hash: "v0.0.0:AjcRjxx7Hp3PKPSNwPeBJjR21pLyA14CVeQ1XijzxUc=",
    provider: "Twitter",
    metaPointer: "https://gitcoin.co/docs.html",
  },
  // credentialStatus: {
  //   id: "https://example.edu/credentials/status/3#94567",
  //   type: "StatusList2021Entry",
  //   statusPurpose: "revocation",
  //   statusListIndex: "94567",
  //   statusListCredential: "https://example.edu/credentials/status/3",
  // },
};

const options = {
  type: "EthereumEip712Signature2021",
};

async function verifyCredential(preparedCredential: any, signedCredential: any) {
  // domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, any>, signature: SignatureLike
  // const standardizedTypes = preparedCredential.signingInput.types;
  const standardizedTypes = signedCredential.proof.eip712Domain.types;

  // Delete EIP712Domain so that ethers does not complain about the ambiguous primary type
  delete standardizedTypes.EIP712Domain;

  const signerAddress = ethers.utils.verifyTypedData(
    {
      name: "Passport",
    },
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

export async function createCredential() {
  const preparedCredential = JSON.parse(
    await DIDKit.prepareIssueCredential(
      JSON.stringify(credentialInput, undefined, 2),
      JSON.stringify(options, undefined, 2),
      JWK,
    ),
  );

  console.log("PREPARE ISSUE CREDENTIAL");
  console.log("===============");
  console.log(JSON.stringify(preparedCredential, undefined, 2));
  console.log("===============");
  const verificationMethod = await DIDKit.keyToVerificationMethod("ethr", JWK);

  const vc_options = {
    verificationMethod,
    type: "EthereumEip712Signature2021",
    eip712Domain: {
      domain: {
        name: "Passport",
      },
      primaryType: "Document",
      types: preparedCredential.signingInput.types,
    },
  };
  const issuedCredential = JSON.parse(
    await DIDKit.issueCredential(
      JSON.stringify(credentialInput, undefined, 2),
      JSON.stringify(vc_options, undefined, 2),
      JWK,
    ),
  );

  console.log("CREDENTIAL");
  console.log("===============");
  console.log(JSON.stringify(issuedCredential, undefined, 2));
  console.log("===============");

  const splitSignature = await verifyCredential(preparedCredential, issuedCredential);

  const verifiation = await DIDKit.verifyCredential(
    JSON.stringify(issuedCredential, undefined, 2),
    JSON.stringify(
      {
        proofPurpose: "assertionMethod",
      },
      undefined,
      2,
    ),
  );
  console.log("===============");
  console.log(verifiation);
  console.log("===============");

  return {
    splitSignature,
    issuedCredential: issuedCredential,
    preparedCredential: preparedCredential,
  };
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
createCredential();
