import { FC } from 'react';
import { VALUE_KEY_DISLIKE, VALUE_KEY_LIKE } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import '../../../../css/room/FurniWindowsBAir.css';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

interface WordQuizQuestionViewProps {
    question: string;
    canVote: boolean;
    vote(value: string): void;
    noVotes: number;
    yesVotes: number;
}

export const WordQuizQuestionView: FC<WordQuizQuestionViewProps> = (props) => {
    const { question = null, canVote = null, vote = null, noVotes = null, yesVotes = null } = props;

    return (
        <NativeTextTree>
            <Column className={`wordquiz-question octane-furni-wordquiz ${canVote ? 'is-voting' : 'is-result'} p-2`} gap={2}>
                {!canVote && (
                    <div className="flex w-full items-center gap-2">
                        <div className="flex items-center justify-center cursor-pointer bg-danger rounded p-2">
                            <Text className="wordquiz-question__count" variant="white">{noVotes}</Text>
                        </div>
                        <Text center textBreak className="wordquiz-question__topic" variant="white">
                            {question}
                        </Text>
                        <div className="flex items-center justify-center cursor-pointer bg-success rounded p-2">
                            <Text className="wordquiz-question__count" variant="white">{yesVotes}</Text>
                        </div>
                    </div>
                )}
                {canVote && (
                    <div className="flex flex-col">
                        <Text center textBreak className="wordquiz-question__topic" variant="white">
                            {question}
                        </Text>
                        <div className="flex w-full gap-1 justify-center">
                            <Flex component={BaseButton} type="button" center pointer className="bg-danger rounded p-1" onClick={(event) => vote(VALUE_KEY_DISLIKE)}>
                                <div className="word-quiz-dislike" />
                            </Flex>
                            <Flex component={BaseButton} type="button" center pointer className="bg-success rounded p-1" onClick={(event) => vote(VALUE_KEY_LIKE)}>
                                <div className="word-quiz-like" />
                            </Flex>
                        </div>
                    </div>
                )}
            </Column>
        </NativeTextTree>
    );
};
