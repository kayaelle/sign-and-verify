const jsonld = require("jsonld");
const { JsonWebKey, JsonWebSignature2020 } = require("@transmute/json-web-signature-2020");
const vc = require("vc-js");
const unlockedDid = require('./unlocked-did:web:digitalcredentials.github.io.json');

const preloadedDocs: { [key: string]: any; } = {};
let unlockedAssertionMethods = new Map([
  ['did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs', unlockedDid.publicKey[0]]
]);

const customLoader = (url: string) => {
  const context = preloadedDocs[url];
  if (context) {
    return {
      contextUrl: null, // this is for a context via a link header
      document: context, // this is the actual document that was loaded
      documentUrl: url // this is the actual contxt URL after redirects
    };
  }
  return jsonld.documentLoaders.node()(url);
};

async function signCore(credJson: any, suite: any, customLoader: any = undefined, testMode = true) {
  try {
    let result = await vc.issue({
      credential: credJson,
      documentLoader: customLoader,
      expansionMap: !testMode,
      suite
    });
    return result;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function verifyCore(result: any, suite: any, customLoader: any, testMode = true) {
  try {
    let valid = await vc.verifyCredential({
      credential: { ...result },
      documentLoader: customLoader,
      expansionMap: !testMode,
      suite
    });
    return valid;
  }
  catch (e) {
    console.error(e);
    throw e;
  }
}


export function getController(fullDid: string) {
  return fullDid.split('#')[0];
}

export function createJwk(assertionMethod: string) {
  const keyInfo: any = unlockedAssertionMethods.get(assertionMethod);
  return new JsonWebKey(keyInfo);
}

// sample options
/*
const options = {
  created: new Date().toISOString(),
  proofPurpose: 'assertionMethod',
  assertionMethod: assertionMethod
};*/

export async function sign(credential: any, options: any) {
  let assertionMethod = options.assertionMethod;
  const signingKey = createJwk(assertionMethod);
  const signatureSuite = new JsonWebSignature2020({
    key: signingKey,
    date: new Date().toISOString() // TODO
  });

  let controller = getController(assertionMethod);
  // update issuer id
  // issuer | id
  if (credential['issuer']) {
    if (credential.issuer['id']) {
      credential.issuer.id = controller;
    } else {
      credential.issuer = controller;
    }
  }

  // sign
  let result = await signCore(credential, signatureSuite, customLoader);
  console.log(JSON.stringify(result, null, 2));
  return result;



  // TODO: created vs issuanceDate, domain, challenge
  // TODO: verification vs assertion method

  /*
  "verificationMethod": "did:example:123#z6MksHh7qHWvybLg5QTPPdG2DgEjjduBDArV9EF9mRiRzMBN",
  "proofPurpose": "assertionMethod",
  "created": "2020-04-02T18:48:36Z",
  "domain": "example.com",
  "challenge": "d436f0c8-fbd9-4e48-bbb2-55fc5d0920a8"
*/


}