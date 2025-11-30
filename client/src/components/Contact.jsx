// Contact.jsx
import React from 'react';

const Contact = () => {
  return (
    <div className="w-full h-screen flex flex-col justify-center items-center bg-blue-100">
      <div className="w-full max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
        <h1 className="text-4xl sm:text-3xl md:text-2xl font-semibold text-center text-blue-800 mb-6">
          Contact Us
        </h1>

        <form className="space-y-4">
          <div className="flex flex-col">
            <label className="text-gray-700" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              type="text"
              className="p-2 border border-gray-300 rounded-lg"
              placeholder="Your Name"
              value="Abhi"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-gray-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="p-2 border border-gray-300 rounded-lg"
              placeholder="Your Email"
              value="abhiraj@gmail.com"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-gray-700" htmlFor="message">
              Contact
            </label>
        <input type="text" 
              className="p-2 border border-gray-300 rounded-lg"
              
              value="9938634125"/>
          </div>

          <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contact;
