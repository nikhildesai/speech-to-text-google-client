import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

const storage = new Storage({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;

    if (!audioFile) {
      return NextResponse.json({ message: 'No audio file provided' }, { status: 400 });
    }

    const fileName = `${uuidv4()}.mp3`;
    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME as string;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await file.save(buffer, {
      metadata: { contentType: audioFile.type },
      public: false, // Keep the file private
    });

    const gcsUri = `gs://${bucketName}/${fileName}`;

    const apiKey = process.env.GOOGLE_API_KEY;
    const speechUrl = `https://speech.googleapis.com/v1/speech:longrunningrecognize?key=${apiKey}`;

    const speechRequestPayload = {
      audio: { uri: gcsUri },
      config: {
        encoding: 'MP3',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
    };

    const speechResponse = await fetch(speechUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(speechRequestPayload),
    });

    const speechOperation = await speechResponse.json();

    if (!speechResponse.ok) {
      return NextResponse.json({ message: speechOperation.error.message }, { status: 500 });
    }

    return NextResponse.json({ operationId: speechOperation.name }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }
};