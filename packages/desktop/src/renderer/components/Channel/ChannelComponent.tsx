import React, { useState, useEffect, useLayoutEffect } from 'react'

import { styled } from '@mui/material/styles'
import { Grid } from '@mui/material'

import Page from '../ui/Page/Page'
import PageHeader from '../ui/Page/PageHeader'

import ChannelHeaderComponent from '../widgets/channels/ChannelHeader'
import ChannelMessagesComponent from '../widgets/channels/ChannelMessages'
import ChannelInputComponent from '../widgets/channels/ChannelInput'

import { INPUT_STATE } from '../widgets/channels/ChannelInput/InputState.enum'

import { useModal, UseModalTypeWrapper } from '../../containers/hooks'

import {
  ChannelMessage,
  DownloadStatus,
  Identity,
  MessagesDailyGroups,
  MessageSendingStatus
} from '@quiet/state-manager'

import { useResizeDetector } from 'react-resize-detector'
import { Dictionary } from '@reduxjs/toolkit'

import UploadFilesPreviewsComponent, {
  UploadFilesPreviewsProps
} from './File/UploadingPreview'

import { DropZoneComponent } from './DropZone/DropZoneComponent'

import { NewMessagesInfoComponent } from './NewMessagesInfo/NewMessagesInfoComponent'

import { FileActionsProps } from './File/FileComponent/FileComponent'

const ChannelMessagesWrapperStyled = styled(Grid)((
  {
    theme
  }
) => ({
  position: 'relative',
  height: 0,
  backgroundColor: theme.palette.colors.white
}))

export interface ChannelComponentProps {
  user: Identity
  channelAddress: string
  channelName: string
  channelSettingsModal: ReturnType<typeof useModal>
  channelInfoModal: ReturnType<typeof useModal>
  messages: {
    count: number
    groups: MessagesDailyGroups
  }
  newestMessage: ChannelMessage
  pendingMessages: Dictionary<MessageSendingStatus>
  downloadStatuses: Dictionary<DownloadStatus>
  lazyLoading: (load: boolean) => void
  onDelete: () => void
  onInputChange: (value: string) => void
  onInputEnter: (message: string) => void
  openUrl: (url: string) => void
  mutedFlag: boolean
  disableSettings?: boolean
  notificationFilter: string
  openNotificationsTab: () => void
  openFilesDialog: () => void
  handleFileDrop: (arg: any) => void
  isCommunityInitialized: boolean
  handleClipboardFiles?: (arg: ArrayBuffer, ext: string, name: string) => void
  uploadedFileModal?: ReturnType<
    UseModalTypeWrapper<{
      src: string
    }>['types']
  >
}

const enum ScrollPosition {
  TOP = 0,
  MIDDLE = -1,
  BOTTOM = 1,
}

export const ChannelComponent: React.FC<ChannelComponentProps & UploadFilesPreviewsProps & FileActionsProps> = ({
  user,
  channelAddress,
  channelName,
  channelInfoModal,
  channelSettingsModal,
  messages,
  newestMessage,
  pendingMessages,
  downloadStatuses,
  lazyLoading,
  onDelete,
  onInputChange,
  onInputEnter,
  openUrl,
  mutedFlag,
  disableSettings = false,
  notificationFilter,
  openNotificationsTab,
  removeFile,
  handleFileDrop,
  filesData,
  isCommunityInitialized = true,
  openFilesDialog,
  handleClipboardFiles,
  uploadedFileModal,
  openContainingFolder,
  downloadFile,
  cancelDownload
}) => {
  const [lastSeenMessage, setLastSeenMessage] = useState<string>()
  const [newMessagesInfo, setNewMessagesInfo] = useState<boolean>(false)

  const [infoClass, setInfoClass] = useState<string>(null)

  const [scrollPosition, setScrollPosition] = React.useState(ScrollPosition.BOTTOM)
  const memoizedScrollHeight = React.useRef<number>()
  const [mathMessagesRendered, onMathMessageRendered] = React.useState<number>(0)

  const updateMathMessagesRendered = () => {
    // To rerender Channel on each call
    onMathMessageRendered(mathMessagesRendered + 1)
  }

  useEffect(() => {
    if (scrollPosition === ScrollPosition.BOTTOM) {
      scrollBottom()
    }
  }, [mathMessagesRendered])

  const onResize = React.useCallback(() => {
    scrollBottom()
  }, [])

  const { ref: scrollbarRef } = useResizeDetector<HTMLDivElement>({ onResize })
  const scrollBottom = () => {
    if (!scrollbarRef.current) return
    setNewMessagesInfo(false)
    memoizedScrollHeight.current = 0
    scrollbarRef.current?.scrollTo({
      behavior: 'auto',
      top: Math.abs(scrollbarRef.current?.clientHeight - scrollbarRef.current?.scrollHeight)
    })
  }

  const onEnterKeyPress = (message: string) => {
    // Send message and files
    onInputEnter(message)
    // Go back to the bottom if scroll is at the top or in the middle
    setScrollPosition(ScrollPosition.BOTTOM)
  }

  /* Get scroll position and save it to the state as 0 (top), 1 (bottom) or -1 (middle) */
  const onScroll = React.useCallback(() => {
    const top = scrollbarRef.current?.scrollTop === 0
    const bottom =
      Math.floor(scrollbarRef.current?.scrollHeight - scrollbarRef.current?.scrollTop) <=
      Math.floor(scrollbarRef.current?.clientHeight)

    let position = ScrollPosition.MIDDLE
    if (top) position = ScrollPosition.TOP
    if (bottom) position = ScrollPosition.BOTTOM

    // Clear new messages info when scrolled back to bottom
    if (bottom) {
      setNewMessagesInfo(false)
    }
    setScrollPosition(position)
  }, [])

  /* Keep scroll position in certain cases */
  useLayoutEffect(() => {
    // Keep scroll at the bottom when new message arrives
    if (scrollbarRef.current && scrollPosition === ScrollPosition.BOTTOM) {
      scrollBottom()
    }
    // Keep scroll position when new chunk of messages is being loaded
    if (scrollbarRef.current && scrollPosition === ScrollPosition.TOP) {
      scrollbarRef.current.scrollTop = scrollbarRef.current.scrollHeight - memoizedScrollHeight.current
    }
  }, [messages])

  /* Lazy loading messages - top (load) */
  useEffect(() => {
    if (scrollbarRef.current.scrollHeight < scrollbarRef.current.clientHeight) return
    if (scrollbarRef.current && scrollPosition === ScrollPosition.TOP) {
      /* Cache scroll height before loading new messages (to keep the scroll position after re-rendering) */
      memoizedScrollHeight.current = scrollbarRef.current.scrollHeight
      lazyLoading(true)
    }
  }, [scrollPosition])

  /* Lazy loading messages - bottom (trim) */
  useEffect(() => {
    if (scrollbarRef.current.scrollHeight < scrollbarRef.current.clientHeight) return
    if (scrollbarRef.current && scrollPosition === ScrollPosition.BOTTOM) {
      lazyLoading(false)
    }
  }, [scrollPosition, messages.count])

  useEffect(() => {
    if (
      Math.floor(scrollbarRef.current?.scrollHeight - scrollbarRef.current?.scrollTop) - 1 >=
      Math.floor(scrollbarRef.current?.clientHeight) &&
      lastSeenMessage !== newestMessage.id
    ) {
      setNewMessagesInfo(true)
    }
  }, [scrollPosition, lastSeenMessage, messages])

  useEffect(() => {
    if (scrollPosition === ScrollPosition.BOTTOM && newestMessage) {
      setLastSeenMessage(newestMessage?.id)
    }
  }, [scrollPosition, messages])

  useEffect(() => {
    scrollBottom()
  }, [channelAddress])

  return (
    <Page>
      <PageHeader>
        <ChannelHeaderComponent
          channelName={channelName}
          onSettings={channelSettingsModal.handleOpen}
          onInfo={channelInfoModal.handleOpen}
          onDelete={onDelete}
          mutedFlag={mutedFlag}
          disableSettings={disableSettings}
          notificationFilter={notificationFilter}
          openNotificationsTab={openNotificationsTab}
        />
      </PageHeader>
      <DropZoneComponent channelName={channelName} handleFileDrop={handleFileDrop}>
        <ChannelMessagesWrapperStyled item xs>
          <NewMessagesInfoComponent scrollBottom={scrollBottom} show={newMessagesInfo} />
          <ChannelMessagesComponent
            messages={messages.groups}
            pendingMessages={pendingMessages}
            downloadStatuses={downloadStatuses}
            scrollbarRef={scrollbarRef}
            onScroll={onScroll}
            uploadedFileModal={uploadedFileModal}
            openUrl={openUrl}
            openContainingFolder={openContainingFolder}
            downloadFile={downloadFile}
            cancelDownload={cancelDownload}
            onMathMessageRendered={updateMathMessagesRendered}
          />
        </ChannelMessagesWrapperStyled>
        <Grid item>
          <ChannelInputComponent
            channelAddress={channelAddress}
            channelName={channelName}
            // TODO https://github.com/TryQuiet/ZbayLite/issues/443
            inputPlaceholder={`#${channelName} as @${user?.nickname}`}
            onChange={value => {
              onInputChange(value)
            }}
            onKeyPress={message => {
              onEnterKeyPress(message)
            }}
            openFilesDialog={openFilesDialog}
            infoClass={infoClass}
            setInfoClass={setInfoClass}
            inputState={
              (isCommunityInitialized && Boolean(messages.count))
                ? INPUT_STATE.AVAILABLE
                : INPUT_STATE.NOT_CONNECTED
            }
            handleClipboardFiles={handleClipboardFiles}
            handleOpenFiles={handleFileDrop}>
            <UploadFilesPreviewsComponent
              filesData={filesData}
              removeFile={id => removeFile(id)}
            />
          </ChannelInputComponent>
        </Grid>
      </DropZoneComponent>
    </Page>
  )
}

export default ChannelComponent
