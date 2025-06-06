import { useEffect, useMemo, useRef } from "react";
import { MessagesProps } from "./props";
import { useChatContext } from "./ChatContext";
import { Message, ResultMessage, TextMessage, Role } from "@copilotkit/runtime-client-gql";
import { useLangGraphInterruptRender } from "@copilotkit/react-core";

export const Messages = ({
  messages,
  inProgress,
  children,
  RenderTextMessage,
  RenderActionExecutionMessage,
  RenderAgentStateMessage,
  RenderResultMessage,
  RenderImageMessage,
  AssistantMessage,
  UserMessage,
  onRegenerate,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  markdownTagRenderers,
}: MessagesProps) => {
  const context = useChatContext();
  const initialMessages = useMemo(
    () => makeInitialMessages(context.labels.initial),
    [context.labels.initial],
  );

  messages = [...initialMessages, ...messages];

  const actionResults: Record<string, string> = {};

  for (let i = 0; i < messages.length; i++) {
    if (messages[i].isActionExecutionMessage()) {
      const id = messages[i].id;
      const resultMessage: ResultMessage | undefined = messages.find(
        (message) => message.isResultMessage() && message.actionExecutionId === id,
      ) as ResultMessage | undefined;

      if (resultMessage) {
        actionResults[id] = ResultMessage.decodeResult(resultMessage.result || "");
      }
    }
  }

  const { messagesContainerRef, messagesEndRef } = useScrollToBottom(messages);

  const interrupt = useLangGraphInterruptRender();

  return (
    <div className="copilotKitMessages" ref={messagesContainerRef}>
      <div className="copilotKitMessagesContainer">
        {messages.map((message, index) => {
          const isCurrentMessage = index === messages.length - 1;

          if (message.isTextMessage()) {
            return (
              <RenderTextMessage
                key={index}
                message={message}
                inProgress={inProgress}
                index={index}
                isCurrentMessage={isCurrentMessage}
                AssistantMessage={AssistantMessage}
                UserMessage={UserMessage}
                onRegenerate={onRegenerate}
                onCopy={onCopy}
                onThumbsUp={onThumbsUp}
                onThumbsDown={onThumbsDown}
                markdownTagRenderers={markdownTagRenderers}
              />
            );
          } else if (message.isActionExecutionMessage()) {
            return (
              <RenderActionExecutionMessage
                key={index}
                message={message}
                inProgress={inProgress}
                index={index}
                isCurrentMessage={isCurrentMessage}
                actionResult={actionResults[message.id]}
                AssistantMessage={AssistantMessage}
                UserMessage={UserMessage}
              />
            );
          } else if (message.isAgentStateMessage()) {
            return (
              <RenderAgentStateMessage
                key={index}
                message={message}
                inProgress={inProgress}
                index={index}
                isCurrentMessage={isCurrentMessage}
                AssistantMessage={AssistantMessage}
                UserMessage={UserMessage}
              />
            );
          } else if (message.isResultMessage()) {
            return (
              <RenderResultMessage
                key={index}
                message={message}
                inProgress={inProgress}
                index={index}
                isCurrentMessage={isCurrentMessage}
                AssistantMessage={AssistantMessage}
                UserMessage={UserMessage}
              />
            );
          } else if (message.isImageMessage && message.isImageMessage()) {
            return (
              <RenderImageMessage
                key={index}
                message={message}
                inProgress={inProgress}
                index={index}
                isCurrentMessage={isCurrentMessage}
                AssistantMessage={AssistantMessage}
                UserMessage={UserMessage}
                onRegenerate={onRegenerate}
                onCopy={onCopy}
                onThumbsUp={onThumbsUp}
                onThumbsDown={onThumbsDown}
              />
            );
          }
        })}
        {interrupt}
      </div>
      <footer className="copilotKitMessagesFooter" ref={messagesEndRef}>
        {children}
      </footer>
    </div>
  );
};

function makeInitialMessages(initial?: string | string[]): Message[] {
  let initialArray: string[] = [];
  if (initial) {
    if (Array.isArray(initial)) {
      initialArray.push(...initial);
    } else {
      initialArray.push(initial);
    }
  }

  return initialArray.map(
    (message) =>
      new TextMessage({
        role: Role.Assistant,
        content: message,
      }),
  );
}

export function useScrollToBottom(messages: any[]) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const isUserScrollUpRef = useRef(false);

  const scrollToBottom = () => {
    if (messagesContainerRef.current && messagesEndRef.current) {
      isProgrammaticScrollRef.current = true;
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      return;
    }

    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      isUserScrollUpRef.current = scrollTop + clientHeight < scrollHeight;
    }
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const mutationObserver = new MutationObserver(() => {
      if (!isUserScrollUpRef.current) {
        scrollToBottom();
      }
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    isUserScrollUpRef.current = false;
    scrollToBottom();
  }, [messages.filter((m) => m.isTextMessage() && m.role === Role.User).length]);

  return { messagesEndRef, messagesContainerRef };
}
