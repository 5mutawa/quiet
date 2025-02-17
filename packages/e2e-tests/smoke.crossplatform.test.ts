import { ThenableWebDriver, Key } from 'selenium-webdriver'
import { BuildSetup } from './crossplatform.utils'
import {
  Channel,
  CreateCommunityModal,
  DebugModeModal,
  JoinCommunityModal,
  LoadingPanel,
  RegisterUsernameModal
} from './selectors.crossplatform'

jest.setTimeout(450000)
describe('Smoke', () => {
  let buildSetup: BuildSetup
  let driver: ThenableWebDriver
  const port = 9515
  const debugPort = 9516
  beforeAll(async () => {
    buildSetup = new BuildSetup(port, debugPort)
    await buildSetup.createChromeDriver()
    driver = buildSetup.getDriver()
    await driver.getSession()
  })

  afterAll(async () => {
    await buildSetup.closeDriver()
    await buildSetup.killChromeDriver()
  })
  describe('Stages:', () => {
    it.skip('Close debug modal', async () => {
      console.log('Debug modal')
      const debugModal = new DebugModeModal(driver)
      await debugModal.element.isDisplayed()
      const button = await debugModal.button
      console.log('Debug modal title is displayed')
      await button.isDisplayed()
      console.log('Button is displayed')
      await button.click()
      console.log('Button click')
      try {
        const log = await driver.executeScript('arguments[0].click();', button)
        console.log('executeScript', log)
      } catch (e) {
        console.log('Probably click properly close modal')
      }
    })
    it('User waits for the modal Starting Quiet to disappear', async () => {
      const loadingPanel = new LoadingPanel(driver, 'Starting Quiet')
      const isLoadingPanel = await loadingPanel.element.isDisplayed()
      await buildSetup.getTorPid()
      expect(isLoadingPanel).toBeTruthy()
    })

    it('User sees "join community" page and switches to "create community" view by clicking on the link', async () => {
      const joinModal = new JoinCommunityModal(driver)
      const isJoinModal = await joinModal.element.isDisplayed()
      expect(isJoinModal).toBeTruthy()

      if (!isJoinModal) {
        const generalChannel = new Channel(driver, 'general')
        const isGeneralChannel = await generalChannel.element.isDisplayed()

        expect(isGeneralChannel).toBeTruthy()
      } else {
        await joinModal.switchToCreateCommunity()
      }
    })

    it('User is on "Create community" page, enters valid community name and presses the button', async () => {
      const createModal = new CreateCommunityModal(driver)
      const isCreateModal = await createModal.element.isDisplayed()
      expect(isCreateModal).toBeTruthy()
      await createModal.typeCommunityName('testcommunity')
      await createModal.submit()
    })

    it('User sees "register username" page, enters the valid name and submits by clicking on the button', async () => {
      const registerModal = new RegisterUsernameModal(driver)
      const isRegisterModal = await registerModal.element.isDisplayed()

      expect(isRegisterModal).toBeTruthy()
      await registerModal.typeUsername('testuser')
      await registerModal.submit()
    })

    it('User waits for the modal Connecting to peers to disappear', async () => {
      const loadingPanelCommunity = new LoadingPanel(driver, 'Connecting to peers')
      const isLoadingPanelCommunity = await loadingPanelCommunity.element.isDisplayed()
      expect(isLoadingPanelCommunity).toBeTruthy()
    })

    it('User sees general channel', async () => {
      const generalChannel = new Channel(driver, 'general')
      const isGeneralChannel = await generalChannel.element.isDisplayed()
      const generalChannelText = await generalChannel.element.getText()
      expect(isGeneralChannel).toBeTruthy()
      expect(generalChannelText).toEqual('# general')
    })
  })
})
