import React from "react";
import Avatar from "react-avatar";

const Client = ({ username }) => {
  return (
    <div className="clientWrapper">
      <Avatar name={username} size="42" round="12px" className="clientAvatar" />
      <span className="clientName">{username}</span>
    </div>
  );
};

export default Client;
