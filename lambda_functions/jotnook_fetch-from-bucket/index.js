const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const kms = new AWS.KMS();
const secretsManager = new AWS.SecretsManager();

async function getSecrets(secretName) {
    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    return JSON.parse(data.SecretString);
}

exports.handler = async (event) => {
    let secrets;
    try {
        secrets = await getSecrets('jotnook-secrets');
    } catch (error) {
        console.error('Error retrieving secrets:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error retrieving secrets" }),
        };
    }

    const SecretBucket = secrets['jotnook-secret-bucket'];

    const prefix = 'uploads/';

    try {
        const data = await s3.listObjectsV2({
            Bucket: SecretBucket,
            Prefix: prefix,
        }).promise();

        console.log('Raw data returned from S3:', JSON.stringify(data, null, 2));

        let notes = {};
        data.Contents.forEach(item => {
            let noteId = item.Key.split('/')[1];
            if (!notes[noteId]) {
                notes[noteId] = { images: [], texts: [] };
            }
            if (item.Key.endsWith('.jpg')) {
                notes[noteId].images.push(item.Key);
            } else if (item.Key.endsWith('.txt')) {
                notes[noteId].texts.push(item.Key);
            }
        });

        notes = Object.keys(notes).map(noteId => {
            return {
                noteId: noteId,
                imageKeys: notes[noteId].images,
                textKeys: notes[noteId].texts,
            };
        });

        console.log('Final notes array:', JSON.stringify(notes, null, 2));

        for (let note of notes) {
            if (note.textKeys.length > 0) {
                const textKey = note.textKeys[0];
                try {
                    const encryptedTextObject = await s3.getObject({ Bucket: SecretBucket, Key: textKey }).promise();
                    console.log(`Ciphertext length for ${textKey}:`, encryptedTextObject.Body.length);

                    if (!Buffer.isBuffer(encryptedTextObject.Body)) {
                        console.error('The S3 object body is not a buffer:', encryptedTextObject.Body);
                        continue;
                    }

                    const decryptedText = await kms.decrypt({ CiphertextBlob: encryptedTextObject.Body }).promise();
                    note.text = decryptedText.Plaintext.toString('utf-8');
                } catch (decryptError) {
                    console.error(`Error decrypting ${textKey}:`, decryptError);
                    note.text = "[Error decrypting note]";
                }
            }
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": true
            },
            body: JSON.stringify(notes),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ message: 'Error listing notes' }),
        };
    }
};
