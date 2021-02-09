import { Button, Icon, Popover, Spinner, Text } from "@blueprintjs/core";
import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom";
import Twitter from "../assets/Twitter.svg";
import {
  getTreeByBlockUid,
  getTreeByPageName,
  generateBlockUid,
} from "roam-client";
import { API_URL, getSettingValueFromTree } from "./hooks";
import axios from "axios";

type ContentProps = {
  blockUid: string;
};

const TwitterContent: React.FunctionComponent<
  ContentProps & { close: () => void }
> = ({ close, blockUid }) => {
  const message = getTreeByBlockUid(blockUid).children.map((t) => ({
    content: t.text,
    uid: t.uid,
  }));
  const [error, setError] = useState("");
  const [tweetsSent, setTweetsSent] = useState(0);
  const onClick = useCallback(() => {
    setTweetsSent(1);
    setError("");
    const tree = getTreeByPageName("roam/js/twitter");
    const oauth = getSettingValueFromTree({
      tree,
      key: "oauth",
      defaultValue: "{}",
    });
    const { oauth_token: key, oauth_token_secret: secret } = JSON.parse(oauth);
    const sentBlockUid = getSettingValueFromTree({
      tree,
      key: "sent",
    })
      .replace("((", "")
      .replace("))", "");
    const sourceUid = generateBlockUid();
    if (sentBlockUid) {
      window.roamAlphaAPI.createBlock({
        location: { "parent-uid": sentBlockUid, order: 0 },
        block: {
          string: `Sent at ${new Date().toISOString()}`,
          uid: sourceUid,
        },
      });
    }
    axios
      .post(`${API_URL}/twitter-tweet`, {
        key,
        secret,
        content: message[0].content,
      })
      .then((r) => {
        setTweetsSent(1);
        close();
        const {
          id,
          user: { screen_name },
        } = r.data;
        if (sentBlockUid) {
          window.roamAlphaAPI.moveBlock({
            location: { "parent-uid": sourceUid, order: 0 },
            block: { uid: message[0].uid },
          });
        }
      })
      .catch(({ error, message }) => {
        setError(error || message);
        setTweetsSent(0);
      });
  }, [setTweetsSent, close, setError]);
  return (
    <div style={{ padding: 16 }}>
      <Button text={`Send Tweet`} onClick={onClick} />
      {tweetsSent > 0 && (
        <>
          Sending {tweetsSent} of {message.length} tweets. <Spinner />
        </>
      )}
      {error && (
        <div style={{ color: "red", whiteSpace: "pre-line" }}>
          <Text>{error}</Text>
        </div>
      )}
    </div>
  );
};

const TweetOverlay: React.FunctionComponent<ContentProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), [setIsOpen]);
  const close = useCallback(() => setIsOpen(false), [setIsOpen]);
  return (
    <Popover
      target={
        <Icon
          icon={
            <Twitter style={{ width: 15, marginLeft: 4, cursor: "pointer" }} />
          }
          onClick={open}
        />
      }
      content={<TwitterContent {...props} close={close} />}
      isOpen={isOpen}
      onInteraction={setIsOpen}
    />
  );
};

export const render = ({
  parent,
  ...contentProps
}: {
  parent: HTMLSpanElement;
} & ContentProps): void =>
  ReactDOM.render(<TweetOverlay {...contentProps} />, parent);

export default TweetOverlay;