'use client';

import { useState, useEffect } from 'react';

const Home: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [operationId, setOperationId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAudioFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setTranscription('');
    setOperationId(null);

    if (!audioFile) {
      setErrorMessage('Please select an audio file');
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioFile);

    try {
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setOperationId(data.operationId);
        setIsPolling(true);
      } else {
        setErrorMessage(data.message);
      }
    } catch (error) {
      setErrorMessage('Error submitting the file');
    }
  };

  useEffect(() => {
    if (isPolling && operationId) {
      const pollOperationStatus = async () => {
        try {
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
          const operationUrl = `https://speech.googleapis.com/v1/operations/${operationId}?key=${apiKey}`;

          const response = await fetch(operationUrl);
          const data = await response.json();

          if (data.done) {
            setIsPolling(false);

            if (data.response) {
              const transcript = data.response.results
                .map((result: any) => result.alternatives[0].transcript)
                .join('\n');
              setTranscription(transcript);
            } else if (data.error) {
              setErrorMessage(`Error: ${data.error.message}`);
            }
          }
        } catch (error) {
          setIsPolling(false);
          setErrorMessage('Error polling the operation status');
        }
      };

      const interval = setInterval(pollOperationStatus, 5000); // Poll every 5 seconds
      return () => clearInterval(interval); // Clear interval when component unmounts or polling stops
    }
  }, [isPolling, operationId]);

  return (
    <div>
      <h1>Speech to Text</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="audio/*" onChange={handleFileChange} />
        <button type="submit">Transcribe</button>
      </form>

      {errorMessage && (
        <div className="message-container error-message">
          <h2>Error:</h2>
          <p>{errorMessage}</p>
        </div>
      )}

      {transcription && (
        <div className="message-container transcription-message">
          <h2>Transcription:</h2>
          <p>{transcription}</p>
        </div>
      )}

      {operationId && !transcription && !errorMessage && (
        <div className="message-container operation-message">
          <h2>Processing...</h2>
          <p>Your audio is being transcribed. Operation ID: {operationId}</p>
        </div>
      )}
    </div>
  );
};

export default Home;