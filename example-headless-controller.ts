import {
  type AgentSubscriber,
  HttpAgent,
  type RunAgentInput,
} from '@ag-ui/client';
import {answerGenerationApi} from '../../../api/knowledge/answer-generation/answer-generation-api.js';
import {
  type AnswerEndpointArgs,
  selectAnswer,
} from '../../../api/knowledge/answer-generation/endpoints/answer/answer-endpoint.js';
import type {InsightEngine} from '../../../app/insight-engine/insight-engine.js';
import type {SearchEngine} from '../../../app/search-engine/search-engine.js';
import {setAgentId} from '../../../features/configuration/configuration-actions.js';
import {
  createFollowUpAnswer,
  followUpCompleted,
  followUpMessageChunkReceived,
  setActiveFollowUpAnswerId,
  setFollowUpAnswerContentFormat,
  setFollowUpIsLoading,
} from '../../../features/follow-up-answers/follow-up-answers-actions.js';
// import {generateFollowUpAnswer} from '../../../features/follow-up-answers/follow-up-answers-actions.js';
import {followUpAnswersReducer as followUpAnswers} from '../../../features/follow-up-answers/follow-up-answers-slice.js';
import type {FollowUpAnswersState} from '../../../features/follow-up-answers/follow-up-answers-state.js';
import {selectAnswerApiQueryParams} from '../../../features/generated-answer/answer-api-selectors.js';
import {generateHeadAnswer} from '../../../features/generated-answer/generated-answer-actions.js';
import type {GeneratedAnswerState} from '../../../index.js';
import type {
  FollowUpAnswersSection,
  GeneratedAnswerSection,
} from '../../../state/state-sections.js';
import {loadReducerError} from '../../../utils/errors.js';
import {
  buildCoreGeneratedAnswer,
  type GeneratedAnswer,
  type GeneratedAnswerAnalyticsClient,
  type GeneratedAnswerProps,
} from '../../core/generated-answer/headless-core-generated-answer.js';

interface GeneratedAnswerWithFollowUpsState extends GeneratedAnswerState {
  followUpAnswers: FollowUpAnswersState;
}

export interface GeneratedAnswerWithFollowUps extends GeneratedAnswer {
  /**
   * The state of the GeneratedAnswer controller.
   */
  state: GeneratedAnswerWithFollowUpsState;
  /**
   * Asks a follow-up question.
   * @param question - The follow-up question to ask.
   */
  askFollowUp(question: string): void;
}

class FollowUpHttpAgent extends HttpAgent {
  protected requestInit(input: RunAgentInput): RequestInit {
    const {q, conversationId} = input.forwardedProps || {};

    return {
      method: 'POST',
      headers: {
        ...this.headers,
        Authorization: `Bearer 123`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        q,
        conversationId,
      }),
      signal: this.abortController.signal,
    };
  }
}

const createFollowUpAnswerStrategy = (
  engine: SearchEngine | InsightEngine
): AgentSubscriber => {
  let runId: string;
  return {
    onRunStartedEvent: ({event}) => {
      console.log('Follow-up Subscriber', event);
      runId = event.runId;
      engine.dispatch(setActiveFollowUpAnswerId(runId));
      engine.dispatch(setFollowUpIsLoading({answerId: runId, isLoading: true}));
      engine.dispatch(
        setFollowUpAnswerContentFormat({
          contentFormat: 'text/markdown',
          answerId: runId,
        })
      );
      engine.dispatch(setFollowUpIsLoading({answerId: runId, isLoading: true}));
    },
    onTextMessageStartEvent: (param) => {
      console.log('Follow-up Subscriber', param);
    },
    onTextMessageContentEvent: (param) => {
      console.log('Follow-up Subscriber', param);
      engine.dispatch(
        followUpMessageChunkReceived({
          textDelta: param.event.delta,
          answerId: runId,
        })
      );
    },
    onCustomEvent: (param) => {
      console.log('Follow-up Subscriber', param);
    },
    onRunErrorEvent: (param) => {
      console.log('Follow-up Subscriber', param);
    },
    onRunFinishedEvent: (param) => {
      console.log('Follow-up Subscriber', param);
      engine.dispatch(
        followUpCompleted({
          cannotAnswer: false,
          answerId: runId,
        })
      );
    },
  };
};

/**
 *
 * @internal
 *
 * Creates a `GeneratedAnswerWithFollowUps` controller instance using the Answer API stream pattern.
 *
 * @param engine - The headless engine.
 * @param props - The configurable `GeneratedAnswerWithFollowUps` properties.
 * @returns A `GeneratedAnswerWithFollowUps` controller instance.
 */
export function buildGeneratedAnswerWithFollowUps(
  engine: SearchEngine | InsightEngine,
  analyticsClient: GeneratedAnswerAnalyticsClient,
  props: GeneratedAnswerProps = {}
): GeneratedAnswerWithFollowUps {
  if (!loadReducers(engine)) {
    throw loadReducerError;
  }

  const agent = new FollowUpHttpAgent({
    url: 'http://localhost:3000/follow-up',
    agentId: 'unique-agent-id',
    threadId: 'conversation id',
  });

  const followUpAnswerStrategy = createFollowUpAnswerStrategy(engine);
  agent.subscribe(followUpAnswerStrategy);

  const {...controller} = buildCoreGeneratedAnswer(
    engine,
    analyticsClient,
    props
  );
  const getState = () => engine.state;
  engine.dispatch(setAgentId(props.agentId ?? ''));

  return {
    ...controller,
    get state() {
      const clientState = getState().generatedAnswer;
      const answerApiQueryParams =
        selectAnswerApiQueryParams(engine.state) ?? {};
      const headAnswerArgs: AnswerEndpointArgs = {
        ...answerApiQueryParams,
        strategyKey: 'head-answer',
      };
      const serverState = selectAnswer(headAnswerArgs, engine.state)?.data;
      const followUpAnswersState = getState().followUpAnswers;

      return {
        /** Server-owned (RTK Query) */
        answer: serverState?.answer,
        answerContentFormat: serverState?.contentFormat,
        citations: serverState?.citations ?? [],
        isLoading: serverState?.isLoading ?? false,
        isStreaming: serverState?.isStreaming ?? false,
        error: serverState?.error,
        answerId: serverState?.answerId,
        isAnswerGenerated: Boolean(serverState?.generated),
        cannotAnswer: serverState?.generated === false,

        /** Client-owned (Redux) */
        isVisible: clientState.isVisible,
        expanded: clientState.expanded,
        liked: clientState.liked,
        disliked: clientState.disliked,
        feedbackSubmitted: clientState.feedbackSubmitted,
        feedbackModalOpen: clientState.feedbackModalOpen,
        isEnabled: clientState.isEnabled,
        responseFormat: clientState.responseFormat,
        fieldsToIncludeInCitations: clientState.fieldsToIncludeInCitations,
        answerGenerationMode: clientState.answerGenerationMode,
        id: clientState.id,

        /** Follow-up answers state */
        followUpAnswers: followUpAnswersState,
      };
    },
    retry() {
      engine.dispatch(generateHeadAnswer());
    },
    askFollowUp(question: string) {
      engine.dispatch(createFollowUpAnswer({question}));
      agent.runAgent({
        forwardedProps: {
          q: question,
          conversationId: 'example-conversation-id',
        },
      });
    },
  };
}

function loadReducers(
  engine: SearchEngine | InsightEngine
): engine is SearchEngine<
  GeneratedAnswerSection &
    FollowUpAnswersSection & {
      answerGenerationApi: ReturnType<typeof answerGenerationApi.reducer>;
    }
> {
  engine.addReducers({
    [answerGenerationApi.reducerPath]: answerGenerationApi.reducer,
    followUpAnswers,
  });
  return true;
}
