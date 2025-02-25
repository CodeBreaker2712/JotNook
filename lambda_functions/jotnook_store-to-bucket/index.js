const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const kms = new AWS.KMS();
const secretsManager = new AWS.SecretsManager();

async function getSecrets(secretName) {
    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    return JSON.parse(data.SecretString);
  }

exports.handler = async (event) => {
    console.log("Received event:", event);

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
  
    const SecretKey = secrets['jotnook-secret-key'];
    const SecretBucket = secrets['jotnook-secret-bucket'];

    try {
        let data;
        if (event.body) {
            data = JSON.parse(event.body);
        } else {
            console.error('No body provided or not in JSON format');
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "No body provided or body not in JSON format" }),
            };
        }
        console.log("Received data:", data); 
  
        if (!data.text || !data.image) {
            throw new Error('The text or image data is missing.');
        }

        const encryptedText = await kms.encrypt({
        KeyId: SecretKey, 
        Plaintext: data.text,
        }).promise();

        const folderName = data.folderName || `uploads/note-${Date.now()}`;

        const textUploadParams = {
            Bucket: SecretBucket, 
            Key: `${folderName}/note.txt`,
            Body: encryptedText.CiphertextBlob,
            ContentType: 'application/octet-stream'
        };
        await s3.upload(textUploadParams).promise();

        const buffer = Buffer.from(data.image, 'base64');
        const imageUploadParams = {
            Bucket: SecretBucket, 
            Key: `${folderName}/image.jpg`,
            Body: buffer,
            ContentEncoding: 'base64',
            ContentType: 'image/jpeg'
        };
        await s3.upload(imageUploadParams).promise();
  
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", 
                "Access-Control-Allow-Credentials": true 
              },
            body: JSON.stringify({ message: "Note saved successfully!" }),
        };
      
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", 
                "Access-Control-Allow-Credentials": true 
              },
            body: JSON.stringify({ message: "Failed to save note", error: error.message }),
        };
    }
};
