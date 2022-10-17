<script lang="ts">
  import Wallet from "./lib/Wallet.svelte";
  import { address } from "./stores";
  // import {
  //   recoverTypedSignature,
  //   SignTypedDataVersion,
  // } from "@metamask/eth-sig-util";
  // import { isValidChecksumAddress, unpadBuffer } from "@ethereumjs/util";

  // import { ethers } from "ethers";
  // import { getSerializedSignedVC } from "./lib/Utils.svelte";
  import { primaryType, stampVCTypes } from "./types/passportTypes";
  import type { ExampleDocument } from "./types";
  import type { Signer, Signature } from "ethers";
  import verifierInterface from "./abi/StampVcVerifier.json";
  import { utils, Wallet as EthersWallet, constants } from "ethers";
  import { providers } from "ethers";
  import { Contract } from "ethers";

  let currentAddress;
  let did;
  let textVC = "your VC here ...";
  let textDomain = "your domain here ...";
  let textTypes = "your types here ...";
  let signerAddress = null;

  const unsubscribe = address.subscribe((value) => {
    currentAddress = value;
    did = "did:pkh:eip155:1:" + currentAddress;
  });

  async function generateVC() {
    const senderAddress = "0x85fF01cfF157199527528788ec4eA6336615C989";
    const verifyingContract = "0x85fF01cfF157199527528788ec4eA6336615C989";
    const signer = currentAddress;
    var deadline = 1665657102;
    const x = 157;
    const chainId = 1;

    const netId = 1;
    console.log("netId", netId);
    console.log("deadline", deadline);
    console.log("x", x);

    const VC = {
      context: [signer, "hello world"],
      issuer: "alla balla portocalla",
      issuanceDate: "2022-01-03",
      expirationDate: "2022-01-30",
      credentialSubject: {
        id: "asdfghjkl",
        hash: "fghjkl;",
        provider: "lkjhgfdsa",
      },
    };
    const msgParams = JSON.stringify({
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        VerifiableCredential: [
          { name: "context", type: "string[]" },
          { name: "issuer", type: "string" },
          { name: "issuanceDate", type: "string" },
          { name: "expirationDate", type: "string" },
          { name: "credentialSubject", type: "Stamp" },
        ],
        Stamp: [
          { name: "id", type: "string" },
          { name: "hash", type: "string" },
          { name: "provider", type: "string" },
        ],
      },
      //make sure to replace verifyingContract with address of deployed contract
      primaryType: "VerifiableCredential",
      domain: {
        name: "SetTest",
        version: "1",
        chainId: netId,
        verifyingContract: "0x85fF01cfF157199527528788ec4eA6336615C989",
      },
      message: VC,
    });

    var from = signer;

    console.log("CLICKED, SENDING PERSONAL SIGN REQ", "from", from, msgParams);
    var params = [from, msgParams];
    console.dir(params);
    var method = "eth_signTypedData_v4";

    web3.currentProvider.sendAsync(
      {
        method,
        params,
        from,
      },
      async function (err, result) {
        if (err) return console.dir(err);
        if (result.error) {
          alert(result.error.message);
        }
        if (result.error) return console.error("ERROR", result);
        console.log("TYPED SIGNED:" + JSON.stringify(result.result));

        //getting r s v from a signature
        const signature = result.result.substring(2);
        const r = "0x" + signature.substring(0, 64);
        const s = "0x" + signature.substring(64, 128);
        const v = parseInt(signature.substring(128, 130), 16);
        console.log("r:", r);
        console.log("s:", s);
        console.log("v:", v);
        console.log(JSON.stringify({ r, s, v }, undefined, 2));
        console.log(JSON.stringify(VC, undefined, 2));

        // const recovered = recoverTypedSignature({
        //   data: JSON.parse(msgParams),
        //   signature: result.result as string,
        //   version: SignTypedDataVersion.V4,
        // });

        // console.log("recovered", recovered);
        // if (
        //   ethUtil.toChecksumAddress(recovered) ===
        //   ethUtil.toChecksumAddress(from)
        // ) {
        //   alert("Successfully recovered signer as " + from);
        // } else {
        //   alert(
        //     "Failed to verify signer when comparing " + result + " to " + from
        //   );
        // }
      }
    );
  }

  const getDomain = (
    name: string,
    chainId: number,
    verifyingContract: string
  ) => ({
    name,
    version: "1",
    chainId,
    verifyingContract,
  });

  type GetSerializedVCInputs = {
    signer: Signer;
    domainName: string;
    verifyingContractAddress: string;
    chainId: number;
    document: ExampleDocument;
  };

  export const getSerializedSignedVC = async ({
    signer,
    domainName,
    verifyingContractAddress,
    chainId,
    document,
  }: GetSerializedVCInputs) => {
    const fullDocument = generateFullDocument(signer.address, document);

    const normalizedDocument = normalizeDocument(fullDocument);
    const signature = await signDocument({
      signer,
      domainName,
      verifyingContractAddress,
      chainId,
      normalizedDocument,
    });

    return {
      ...normalizedDocument,
      // fullSignature: signature.fullSignature,
      proof: {
        created: fullDocument.issuanceDate,
        eip712: {
          domain: {
            name: domainName,
          },
          primaryType,
          types: stampVCTypes,
        },
        proofPurpose: "assertionMethod",
        proofValue: signature.fullSignature,
        // {
        //   v: signature.v,
        //   r: signature.r,
        //   s: signature.s,
        // },
        type: "EthereumEip712Signature2021",
        verificationMethod: `${fullDocument.issuer}#blockchainAccountId`,
      },
    };
  };

  type FullDocument = ExampleDocument & {
    issuer: string;
    issuanceDate: string;
    expirationDate: string;
  };
  const date = new Date();
  const generateFullDocument = (
    signerAddress: string,
    document: ExampleDocument
  ): FullDocument => ({
    ...document,
    issuer: `did:pkh:eip155:1:${signerAddress}`,
    issuanceDate: date.toISOString(),
    expirationDate: new Date(date.setMonth(date.getMonth() + 3)).toISOString(),
  });

  type NormalizedDocument = {
    _context: string[];
    _type: string[];
    credentialSubject: {
      id: string;
      hash: string;
      provider: string;
    };
    issuer: string;
    issuanceDate: string;
    expirationDate: string;
  };

  const normalizeDocument = (
    fullDocument: FullDocument
  ): NormalizedDocument => {
    const _context = fullDocument["@context"];
    const _type = fullDocument.type;

    const normalizedDocument = { ...fullDocument, _context, _type };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete normalizedDocument["@context"];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete normalizedDocument["type"];
    return normalizedDocument;
  };

  type SignDocumentInputs = {
    signer: Signer;
    domainName: string;
    verifyingContractAddress: string;
    chainId: number;
    normalizedDocument: NormalizedDocument & {
      issuer: string;
      issuanceDate: string;
      expirationDate: string;
    };
  };

  export const signDocument = async ({
    signer,
    domainName,
    verifyingContractAddress,
    chainId,
    normalizedDocument,
  }: SignDocumentInputs): Promise<Signature & { fullSignature: string }> => {
    const domain = getDomain(domainName, chainId, verifyingContractAddress);

    let sig: string;
    try {
      console.log({ domain, stampVCTypes, normalizedDocument });
      sig = await signer._signTypedData(
        domain,
        stampVCTypes,
        normalizedDocument
      );
      console.log("Signature: ", sig);
    } catch (err) {
      console.error(err);
      throw err;
    }

    return { fullSignature: sig, ...utils.splitSignature(sig) };
  };

  async function generateVC1() {
    console.log("generating VC ...");
    const chainId = 1;
    console.log("import.meta.env.MNEMONIC", import.meta.env.VITE_MNEMONIC);
    const signer = EthersWallet.fromMnemonic(import.meta.env.VITE_MNEMONIC);
    signerAddress = await signer.getAddress();
    const domainName = "stamp-vc-verifier-test";
    const passportDocument = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://schema.org",
        "https://w3id.org/security/v2",
      ],
      type: ["VerifiableCredential"],
      credentialSubject: {
        id: "did:pkh:eip155:1:0x753CFB338925fFEca0ad7f0517362D0CD3085d83",
        provider: "TenOrMoreGithubFollowers",
        hash: "v0.0.0:YHStCYx6ya3vnyOJSiniYDV8DiMe5Q3mP2U9Cjiuzro=",
      },
      issuer: "did:key:z6MkuTipUJybMY6H7jm4kFic8pnAhKXM5PcaxEMWSB5WmRmG",
      issuanceDate: "2022-10-05T21:57:39.378Z",
      expirationDate: "2023-01-03T22:57:39.378Z",
    };

    const serializedVC = await getSerializedSignedVC({
      signer,
      chainId,
      domainName,
      // Using the zero address so it's not tied to a single contract and can be verified
      // in multiple ones.
      verifyingContractAddress: constants.AddressZero,
      document: passportDocument,
    });

    const { v, r, s } = utils.splitSignature(serializedVC.proof.proofValue);
    const { proof, ...vcWithoutProof } = serializedVC;
    console.log("proof:", proof);

    const domain = getDomain(domainName, chainId, constants.AddressZero);
    textDomain = JSON.stringify(domain, undefined, 2);
    textVC = JSON.stringify(serializedVC, undefined, 2);
    console.log("VERIFICATION domain: ", domain);
    console.log("VERIFICATION stampVCTypes: ", stampVCTypes);
    console.log("VERIFICATION vcWithoutProof: ", vcWithoutProof);
    console.log("VERIFICATION proof.proofValue: ", proof.proofValue);
    const recoveredAddress = utils.verifyTypedData(
      domain,
      stampVCTypes,
      vcWithoutProof,
      proof.proofValue
    );
    console.log("recoveredAddress:", recoveredAddress);
    console.log("expected        :", signerAddress);
    

    // const myProvider = new providers.JsonRpcProvider(
    //   "http://localhost:8545"
    // );

    // // const verifierContract = new ethers.Contract(import.meta.env.VITE_VERIFIER_CONTRACT_ADDRESS, verifierInterface, provider);
    // const verifierContract = new Contract(
    //   "0x2fCf4f2950ae63a4F1f7034724CC66Bb0842fe8A",
    //   verifierInterface,
    //   myProvider
    // );

    // console.log("vcWithoutProof", vcWithoutProof);

    // const verificationResult = await verifierContract.verifyStampVc(
    //   vcWithoutProof,
    //   v,
    //   r,
    //   s
    // );
    // // const verificationResult = await verifierContract.test();
    // console.log("Verification result: ", verificationResult);

    // vcWithoutProof.expirationDate = "Corupted date";
    // console.log("vcWithoutProof", vcWithoutProof);
    // const verificationResultBad = await verifierContract.verifyStampVc(
    //   vcWithoutProof,
    //   v,
    //   r,
    //   s
    // );
    // // const verificationResult = await verifierContract.test();
    // console.log("Verification result: ", verificationResultBad);
  }

  async function recoverSigner() {
    const { ...inputData } = JSON.parse(textVC) as any;
    const domain = JSON.parse(textDomain) as any;
    const types = JSON.parse(textTypes) as any;
    const proovValue = inputData.proof.proofValue;
    delete inputData.proof["proofValue"];

    console.log("VERIFICATION domain: ", JSON.stringify(domain, undefined, 2));
    console.log(
      "VERIFICATION stampVCTypes: ",
      JSON.stringify(types, undefined, 2)
    );
    console.log(
      "VERIFICATION inputData: ",
      JSON.stringify(inputData, undefined, 2)
    );
    console.log(
      "VERIFICATION proovValue: ",
      JSON.stringify(proovValue, undefined, 2)
    );

    const recoveredAddress = utils.verifyTypedData(
      domain,
      types,
      inputData,
      proovValue
    );

    console.log("Recovered address:", recoveredAddress);
  }
</script>

<main>
  <div>
    <h1>VC verifier</h1>
  </div>

  <div class="card">
    <!-- <Wallet /> -->
  </div>
  <pre>{currentAddress}</pre>
  <div>
    <button on:click={generateVC}>Generate VC</button>
    <button on:click={generateVC1}>Generate VC with ethers</button>
    <button on:click={recoverSigner}>Recover signer</button>
  </div>

  <div>Domain</div>
  <textarea rows="30" cols="80" bind:value={textDomain} />
  <div>VC</div>
  <textarea rows="30" cols="80" bind:value={textVC} />
  <div>Types</div>
  <textarea rows="30" cols="80" bind:value={textTypes} />
</main>

<style>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
  .read-the-docs {
    color: #888;
  }
</style>
