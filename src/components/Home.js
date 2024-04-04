import React from 'react';
import '../styles/Home.css';
import { IoImages } from 'react-icons/io5';

class Home extends React.Component {
  state = {
    notes: [],
    creatingNote: false,
    uploadingImage: false,
    noteText: "", // Add this to track note text
    noteImage: null, // Add this to track the selected image file
  };

  componentDidMount() {
    this.fetchNotes();
  }

  fetchNotes = () => {
    // Fetch notes from the backend or local storage
  }

  handleNewNote = () => {
    this.setState({ creatingNote: true }); // Update state to show the note creation card
  }

  handleNoteTextChange = (event) => {
    this.setState({ noteText: event.target.value });
  }

  handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      this.setState({ noteImage: file }); // Store the file in state
    }
  }

  handleSaveNote = async () => {
    const { noteText, noteImage } = this.state;
    if (noteText && noteImage) {
      this.setState({ uploadingImage: true });
      const timestamp = Date.now();
      const folderName = `uploads/note-${timestamp}`;
      try {
        // Convert image to base64
        const base64Image = await this.getBase64(noteImage);
        const noteData = {
          text: noteText,
          image: base64Image,
          folderName: folderName,
        };

        // Send both text and image in one request
        const response = await fetch('https://av6sanzysf.execute-api.us-east-1.amazonaws.com/stage-api-triggers-lambda/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(noteData),
        });

        if (response.ok) {
          console.log('Note successfully saved');
          // Clear the form and refresh the notes list
          this.setState({
            creatingNote: false,
            noteText: "",
            noteImage: null,
          });
          this.fetchNotes();
        } else {
          const errorResponse = await response.json();
          throw new Error(errorResponse.message);
        }
      } catch (error) {
        console.error('Error during the save process:', error);
      } finally {
        this.setState({ uploadingImage: false });
      }
    } else {
      console.log('Please add both text and an image to the note.');
    }
  };

  getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result.split(',')[1];
        resolve(base64Image);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  uploadText = async (textData) => {
    try {
      const response = await fetch('https://av6sanzysf.execute-api.us-east-1.amazonaws.com/stage-api-triggers-lambda/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textData),
      });
      return response;
    } catch (error) {
      console.error('Error uploading text:', error);
      return { ok: false };
    }
  };
  
  uploadImageToS3 = (file, timestamp) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Image = reader.result.split(',')[1];
          const imageData = {
            image: base64Image,
            folderName: `uploads/note-${timestamp}`,
          };
          const response = await fetch('https://av6sanzysf.execute-api.us-east-1.amazonaws.com/stage-api-triggers-lambda/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(imageData),
          });
          if (response.ok) {
            console.log('Image successfully uploaded');
            resolve(response);
          } else {
            throw new Error('Network response was not ok.');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          reject(error);
        }
      };
      reader.onerror = () => {
        console.error('Error reading image file');
        reject('Error reading image file');
      };
      reader.readAsDataURL(file);
    });
  };
  

  renderNoteCreationCard = () => (
    <div className="note-creation-card">
      <textarea
        placeholder="Type your note here..."
        value={this.state.noteText}
        onChange={this.handleNoteTextChange}
      ></textarea>
      <label htmlFor="file-input">
        <IoImages className="images-icon" />
      </label>
      <input
        id="file-input"
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={this.handleFileInputChange}
      />
      {/* Show loading indicator if uploading */}
      {this.state.uploadingImage && <p>Uploading Image...</p>}
      <button onClick={this.handleSaveNote}>Save Note</button>
    </div>
  );

  render() {
    return (
      <div className="home-container">
        <header className="header">
          <button onClick={this.handleNewNote}>Create Note</button>
        </header>
        <main className="notes-grid">
          {this.state.creatingNote && this.renderNoteCreationCard()}
          {this.state.notes.map(note => (
            <div key={note.id} className="note-card">
              <h3>{note.title}</h3>
              <p>{note.summary}</p>
              {/* More note details here */}
            </div>
          ))}
        </main>
      </div>
    );
  }
}

export default Home;
