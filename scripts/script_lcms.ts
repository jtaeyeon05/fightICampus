(async function (){
    // Logic

    let test = false

    function log(msg: string, tag: string | null = null, err: boolean = false): void {
        if (test) console.log(tag ? `[fightICampus][S/L][${tag}] ${msg}` : `[fightICampus][S/L] ${msg}`)
        chrome.runtime.sendMessage({
            command: "log",
            msg: tag ? `[S/L][${tag}] ${msg}` : `[S/L] ${msg}`,
            err: err
        })
    }

    function getByMessage(message: any): Promise<any> {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                message,
                (response) => { resolve(response) }
            )
        })
    }

    async function getSetting<T>(settingId: string): Promise<T> {
        const defaultValue = await getByMessage({
            command: "getDefaultSetting",
            settingId: settingId
        })
        return new Promise((resolve) => {
            chrome.storage.sync.get([settingId], (result) => {
                log(`Setting Loaded: ${settingId}, ${result[settingId]}(l), ${defaultValue}(d)`)
                if (result[settingId] == undefined) resolve(defaultValue)
                else resolve(result[settingId])
            })
        })
    }
    if (!await getSetting("setting-work")) return
    test = await getSetting("setting-test-mode")

    function nativeVideo(url: string): void {
        function logN(msg: any, err: boolean = false): void { log(msg, "nativeVideo", err) }
        logN("Started")
        const a = document.createElement("a")
        a.href = url
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        logN("Ended")
    }

    function requestPip(): void {
        function logN(msg: any, err: boolean = false): void { log(msg, "requestPiP", err) }
        logN("Started")
        let videoElement = document.querySelector("video")
        if (videoElement && !videoElement.src.endsWith("preloader.mp4") && !videoElement.src.endsWith("intro1.mp4")) videoElement.requestPictureInPicture()
        logN("Ended")
    }

    async function getContentUrl(
        { urlArray, targetContentType="video/mp4" }: { urlArray: string[], targetContentType?: string }
    ): Promise<string> {
        for (let url of urlArray) {
            log(`Check ${url}`, "getContentUrl", false)
            let response = await fetch(url, {method: "HEAD"})
            let contentType = response.headers.get("content-type")
            if (contentType == targetContentType) return url
        }
        throw Error("The content type of every url isn't the same as the target file type.")
    }

    async function downloadICampus(
        { url, filename="output.mp4" }: { url: string, filename?: string }
    ): Promise<boolean> {
        function logD(msg: any, err: boolean = false): void { log(msg, "downloadICampus", err) }
        logD("Started")
        return fetch(url)
            .then((response) => {
                logD("Connected")
                return response.blob()
            })
            .then((blob) => {
                const blobUrl = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = blobUrl
                a.download = filename
                document.body.appendChild(a)
                a.click()
                URL.revokeObjectURL(blobUrl)
                document.body.removeChild(a)
                logD("Ended")
                return true
            })
            .catch((e) => {
                logD("Exception")
                logD(`${e}`, true)
                return false
            })
    }


    // Inspect

    log(`taget: ${window.location.href}`)

    let targetScript: string | null = document.scripts[0].textContent
    let variableList: string[] | undefined = targetScript?.split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => line.split(" = ")[1].split(";")[0].replaceAll("\"", ""))

    let [contentId, contentName, _, contentType] = ["", "", "", ""]
    if (variableList && variableList.length > 0) {
        [contentId, contentName,, contentType] = variableList
    }

    let contentTitle: string | null = await getByMessage({
        command: "getItemViewData",
        contentId: contentId
    })

    let userName: string | null = document.querySelector("meta[name=\"user_name\"]")?.getAttribute("content") ?? null
    let thumbnail: string | null = document.querySelector("meta[property=\"og:image\"]")?.getAttribute("content") ?? null
    let duration: string | null = document.querySelector("meta[name=\"duration\"]")?.getAttribute("content") ?? null
    let registrationDate: string | null = document.querySelector("meta[name=\"regdate\"]")?.getAttribute("content") ?? null

    let contentPath = thumbnail?.split(contentId)[0]
    let contentUrlArray: string[] = []
    let contentUrl: string | null = null
    let durationStr: string | null = null
    let registrationDateStr: string | null = null
    let contentTypeStr: string = ""
    if (duration) {
        durationStr = ""
        let durationInt = parseInt(duration)
        if (Math.floor(durationInt / 3600)) durationStr += `${Math.floor(durationInt / 3600)}시간 `
        durationInt = durationInt % 3600
        if (durationStr || Math.floor(durationInt / 60)) durationStr += `${Math.floor(durationInt / 60)}분 `
        durationInt = durationInt % 60
        if (durationStr || durationInt) durationStr += `${durationInt}초`
    }
    if (registrationDate) {
        registrationDateStr = ""
        registrationDateStr += `${registrationDate.slice(0, 4)}/${registrationDate.slice(4, 6)}/${registrationDate.slice(6, 8)} `
        registrationDateStr += `${registrationDate.slice(8, 10)}:${registrationDate.slice(10, 12)}:${registrationDate.slice(12, 14)}`
    }
    switch (contentType) {
        case "2":
            contentUrlArray.push(`${contentPath}${contentId}/contents/media_files/mobile/ssmovie.mp4`)
            contentUrl = await getContentUrl({ urlArray: contentUrlArray }).catch(() => null)
            contentTypeStr = "일반 동영상 (2)"
            break
        case "10":
            /*
             * TODO: `https://lcms.skku.edu/index.php?module=xn_media_content2013&act=dispXn_media_content2013DownloadWebFile&site_id=skku100001&content_id=${contentId}&web_storage_id=31&file_subpath=contents%5Cweb_files%5Coriginal.pdf&file_name=FILENAME`
            */
            // movLink.push()
            // contentUrl = await getContentUrl({ urlArray: contentUrlArray, targetContentType: "TODO" }).catch(() => null)
            contentTypeStr = "PDF (10)"
            break
        case "13":
            contentUrlArray.push(`${contentPath}${contentId}/contents/media_files/sub.mp4`)
            contentUrlArray.push(`${contentPath}${contentId}/contents/media_files/main.mp4`)
            contentUrl = await getContentUrl({ urlArray: contentUrlArray }).catch(() => null)
            contentTypeStr = "화면 + 캠 동영상 (13)"
            break
        case "18":
            contentUrlArray.push(`${contentPath}${contentId}/contents/media_files/screen.mp4`)
            contentUrl = await getContentUrl({ urlArray: contentUrlArray }).catch(() => null)
            contentTypeStr = "화면 동영상 (18)"
            break
        case "29":
            contentUrlArray.push(`${contentPath}${contentId}/contents/media_files/screen.mp4`)
            contentUrl = await getContentUrl({ urlArray: contentUrlArray }).catch(() => null)
            contentTypeStr = "캡쳐 영상 (29)"
            break
        default:
            if (contentType) {
                contentUrlArray.push(`${contentPath}${contentId}/contents/media_files/mobile/ssmovie.mp4`)
                contentUrlArray.push(`${contentPath}${contentId}/contents/media_files/mobile/screen.mp4`)
                contentUrlArray.push(`${contentPath}${contentId}/contents/media_files/mobile/sub.mp4`)
                contentUrlArray.push(`${contentPath}${contentId}/contents/media_files/mobile/main.mp4`)
                contentUrl = await getContentUrl({ urlArray: contentUrlArray }).catch(() => null)
                contentTypeStr = `확인되지 않은 타입 (${contentType})`
            }
    }

    log(`contentId: ${contentId}`)
    log(`contentName: ${contentName}`)
    log(`contentType: ${contentType}`)
    log(`contentTitle: ${contentTitle}`)
    log(`userName: ${userName}`)
    log(`thumbnail: ${thumbnail}`)
    log(`duration: ${duration}`)
    log(`registrationDate: ${registrationDate}`)
    log(`contentPath: ${contentPath}`)
    log(`contentUrlArray: ${contentUrlArray}`)
    log(`contentUrl: ${contentUrl}`)
    log(`contentTypeStr: ${contentTypeStr}`)

    // UI

    const showUI: boolean = (contentUrl != null)
    if (showUI) {

        let font = `@font-face { font-family: 'NanumSquareNeo'; src: url(https://hangeul.pstatic.net/hangeul_static/webfont/NanumSquareNeo/NanumSquareNeoTTF-bRg.eot); src: url(https://hangeul.pstatic.net/hangeul_static/webfont/NanumSquareNeo/NanumSquareNeoTTF-bRg.eot?#iefix) format("embedded-opentype"), url(https://hangeul.pstatic.net/hangeul_static/webfont/NanumSquareNeo/NanumSquareNeoTTF-bRg.woff) format("woff"), url(https://hangeul.pstatic.net/hangeul_static/webfont/NanumSquareNeo/NanumSquareNeoTTF-bRg.ttf) format("truetype"); }' +
    '@font-face { font-family: 'NanumSquareNeoBold'; src: url(https://hangeul.pstatic.net/hangeul_static/webfont/NanumSquareNeo/NanumSquareNeoTTF-cBd.eot); src: url(https://hangeul.pstatic.net/hangeul_static/webfont/NanumSquareNeo/NanumSquareNeoTTF-cBd.eot?#iefix) format("embedded-opentype"), url(https://hangeul.pstatic.net/hangeul_static/webfont/NanumSquareNeo/NanumSquareNeoTTF-cBd.woff) format("woff"), url(https://hangeul.pstatic.net/hangeul_static/webfont/NanumSquareNeo/NanumSquareNeoTTF-cBd.ttf) format("truetype"); }`
        const fontStyle = document.createElement("style")
        fontStyle.textContent = font
        document.head.append(fontStyle)

        const bootstrapCDN = document.createElement("link")
        bootstrapCDN.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css"
        bootstrapCDN.rel = "stylesheet"
        bootstrapCDN.integrity = "sha384-LN+7fdVzj6u52u30Kp6M/trliBMCMKTyK833zpbD+pXdCLuTusPj697FH4R/5mcr"
        bootstrapCDN.crossOrigin = "anonymous"
        document.head.append(bootstrapCDN)

        const bootstrapIconsCDN = document.createElement("link")
        bootstrapIconsCDN.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css"
        bootstrapIconsCDN.rel = "stylesheet"
        document.head.append(bootstrapIconsCDN)

        function makeButton(button: HTMLButtonElement, text: string, for_menu: boolean = false): void {
            button.textContent = text
            button.style.padding = "8px 12px"
            button.style.fontFamily = "NanumSquareNeo"
            button.style.fontSize = "12px"
            button.style.lineHeight = "1"
            button.style.borderColor = "#000000"
            button.style.borderWidth = "1px"
            button.style.borderStyle = "solid"
            button.style.borderRadius = "6px"
            button.style.backgroundColor = "#0945A0"
            button.style.color = "#ffffff"
            button.style.cursor = "pointer"
            if (for_menu) {
                button.style.opacity = "0.75"
            }
        }

        log(`UI Load Started`)

        const div = document.createElement("div")
        div.id = "fightICampusDiv"
        div.style.position = "fixed"
        div.style.top = "20px"
        div.style.right = "20px"
        div.style.zIndex = "9999"

        // InspectPopup
        let showInspectPopup = false
        const inspectPopup = document.createElement("div")
        inspectPopup.style.position = "relative"
        inspectPopup.style.marginLeft = "auto"
        inspectPopup.style.width = "320px"
        inspectPopup.style.borderColor = "#000000"
        inspectPopup.style.borderWidth = "1px"
        inspectPopup.style.borderStyle = "solid"
        inspectPopup.style.borderRadius = "16px"
        inspectPopup.style.padding = "20px"
        inspectPopup.style.marginTop = "10px"
        inspectPopup.style.backgroundColor = "#ffffff"

        const inspectTitle = document.createElement("h5")
        inspectTitle.textContent = "영상 분석"
        inspectTitle.style.fontFamily = "NanumSquareNeoBold"
        inspectPopup.appendChild(inspectTitle)

        const inspectClose = document.createElement("p")
        inspectClose.textContent = "X"
        inspectClose.style.position = "absolute"
        inspectClose.style.top = "0px"
        inspectClose.style.right = "0px"
        inspectClose.style.padding = "25px"
        inspectClose.style.fontFamily = "NanumSquareNeo"
        inspectClose.style.fontSize = "16px"
        inspectClose.style.lineHeight = "1"
        inspectClose.style.cursor = "pointer"
        inspectClose.addEventListener("click", () => {
            div.removeChild(inspectPopup)
            showInspectPopup = false
        })
        inspectPopup.appendChild(inspectClose)

        if (thumbnail) {
            const inspectImage = document.createElement("img")
            inspectImage.src = thumbnail
            inspectImage.style.width = "160px"
            inspectImage.style.display = "block"
            inspectImage.style.marginBottom = "12px"
            inspectImage.style.marginLeft = "auto"
            inspectImage.style.marginRight = "auto"
            inspectImage.style.borderColor = "#000000"
            inspectImage.style.borderWidth = "1px"
            inspectImage.style.borderStyle = "solid"
            inspectPopup.appendChild(inspectImage)
        }

        const inspectContentDiv = document.createElement("div")
        const contentList = [
            `영상 제목: ${contentTitle}`,
            `영상 이름: ${contentName}`,
            `담당 교수님: ${userName}`,
            `영상 길이: ${durationStr}`,
            `영상 등록: ${registrationDateStr}`,
            `영상 ID: ${contentId}`,
            `영상 Type: ${contentTypeStr}`
        ]
        for (let content of contentList) {
            const inspectText = document.createElement("p")
            inspectText.textContent = content
            inspectText.style.fontFamily = "NanumSquareNeo"
            inspectText.style.fontSize = "12px"
            inspectText.style.marginTop = "0px"
            inspectText.style.marginBottom = "4px"
            inspectContentDiv.appendChild(inspectText)
        }
        inspectPopup.appendChild(inspectContentDiv)

        const nativeVideoButtonDiv = document.createElement("div")
        nativeVideoButtonDiv.style.width = "fit-content"
        nativeVideoButtonDiv.style.display = "flex"
        nativeVideoButtonDiv.style.alignItems = "center"
        nativeVideoButtonDiv.style.marginTop = "12px"
        nativeVideoButtonDiv.style.marginLeft = "auto"
        nativeVideoButtonDiv.style.gap = "8px"
        inspectPopup.appendChild(nativeVideoButtonDiv)

        const nativeVideoLocalButton = document.createElement("button")
        makeButton(nativeVideoLocalButton, "NV", false)
        nativeVideoLocalButton.addEventListener("click", () => {
            nativeVideo(contentUrl!!)
        })
        nativeVideoButtonDiv.appendChild(nativeVideoLocalButton)

        const nativeVideoNTButton = document.createElement("button")
        makeButton(nativeVideoNTButton, "NVNT", false)
        nativeVideoNTButton.addEventListener("click", () => {
            chrome.runtime.sendMessage({
                command: "nativeVideo",
                url: contentUrl
            })
        })
        nativeVideoButtonDiv.appendChild(nativeVideoNTButton)

        // DownloadPopup
        let showDownloadPopup = false
        const downloadPopup = document.createElement("div")
        downloadPopup.style.position = "relative"
        downloadPopup.style.marginLeft = "auto"
        downloadPopup.style.width = "320px"
        downloadPopup.style.borderColor = "#000000"
        downloadPopup.style.borderWidth = "1px"
        downloadPopup.style.borderStyle = "solid"
        downloadPopup.style.borderRadius = "16px"
        downloadPopup.style.padding = "20px"
        downloadPopup.style.marginTop = "10px"
        downloadPopup.style.backgroundColor = "#ffffff"

        const downloadTitle = document.createElement("h5")
        downloadTitle.textContent = "다운로드"
        downloadTitle.style.fontFamily = "NanumSquareNeoBold"
        downloadPopup.appendChild(downloadTitle)

        const downloadClose = document.createElement("p")
        downloadClose.textContent = "X"
        downloadClose.style.position = "absolute"
        downloadClose.style.top = "0px"
        downloadClose.style.right = "0px"
        downloadClose.style.padding = "25px"
        downloadClose.style.fontFamily = "NanumSquareNeo"
        downloadClose.style.fontSize = "16px"
        downloadClose.style.lineHeight = "1"
        downloadClose.style.cursor = "pointer"
        downloadClose.addEventListener("click", () => {
            div.removeChild(downloadPopup)
            showDownloadPopup = false
        })
        downloadPopup.appendChild(downloadClose)

        const downloadInputTitle = document.createElement("p")
        downloadInputTitle.textContent = "파일명"
        downloadInputTitle.style.fontFamily = "NanumSquareNeo"
        downloadInputTitle.style.fontSize = "12px"
        downloadInputTitle.style.lineHeight = "1"
        downloadInputTitle.style.marginBottom = "4px"
        downloadPopup.appendChild(downloadInputTitle)

        const downloadInput = document.createElement("input")
        downloadInput.value = await getSetting("setting-download-content-name") ? contentName : (contentTitle ? contentTitle : contentName)
        downloadInput.type = "text"
        downloadInput.placeholder = "/\\:*?\"<> 금지"
        downloadInput.style.padding = "8px 12px"
        downloadInput.style.fontFamily = "NanumSquareNeo"
        downloadInput.style.fontSize = "14px"
        downloadInput.style.lineHeight = "1"
        downloadInput.style.width = "280px"
        downloadInput.style.marginBottom = "12px"
        downloadInput.addEventListener(
            'keydown',
            (e) => { e.stopImmediatePropagation() },
            true
        )
        downloadPopup.appendChild(downloadInput)

        const downloadPopupButtonDiv = document.createElement("div")
        downloadPopupButtonDiv.style.display = "flex"
        downloadPopupButtonDiv.style.flexDirection = "row-reverse"
        downloadPopupButtonDiv.style.alignItems = "center"
        downloadPopupButtonDiv.style.marginLeft = "auto"
        downloadPopupButtonDiv.style.gap = "12px"
        downloadPopup.appendChild(downloadPopupButtonDiv)

        const downloadSpinner = document.createElement("div")
        downloadSpinner.className = "spinner-border"
        downloadSpinner.style.width = "1.5rem"
        downloadSpinner.style.height = "1.5rem"
        downloadSpinner.role = "status"

        const checkIcon = document.createElement("i")
        checkIcon.className = "bi bi-check"
        checkIcon.style.fontSize = "1.5rem"

        let showDownloadPopupMessage = false
        const downloadPopupMessage = document.createElement("p")
        downloadPopupMessage.textContent = "오류 발생"
        downloadPopupMessage.style.fontFamily = "NanumSquareNeo"
        downloadPopupMessage.style.fontSize = "12px"
        downloadPopupMessage.style.color = "#7a0520"

        const downloadPopupButton = document.createElement("button")
        makeButton(downloadPopupButton, "다운로드", false)
        downloadPopupButton.addEventListener("click", () => {
            log(`contentUrl: ${contentUrl}`)
            if (showDownloadPopupMessage) downloadPopupButtonDiv.removeChild(downloadPopupMessage)

            downloadPopupButton.style.backgroundColor = "#5f6b7e"
            downloadPopupButton.style.cursor = "wait"
            downloadPopupButton.disabled = true

            downloadPopupButtonDiv.appendChild(downloadSpinner)

            let filename = contentTitle ? contentTitle : contentName
            if (downloadInput.value.trim() != "" && !/[\/:*?"<>\\]/.test(downloadInput.value)) filename = downloadInput.value.trim()
            downloadICampus({url: contentUrl!!, filename: `${filename}.mp4`})
                .then((result: boolean) => {
                    if (!result) {
                        showDownloadPopupMessage = true
                        downloadPopupButtonDiv.appendChild(downloadPopupMessage)
                    }
                    downloadPopupButton.style.backgroundColor = "#0945A0"
                    downloadPopupButton.style.cursor = "pointer"
                    downloadPopupButton.disabled = false
                    downloadPopupButtonDiv.removeChild(downloadSpinner)

                    downloadPopupButtonDiv.appendChild(checkIcon)
                    setTimeout(() => {
                        downloadPopupButtonDiv.removeChild(checkIcon)
                        if (showDownloadPopup) {
                            div.removeChild(downloadPopup)
                            showDownloadPopup = false
                        }
                    }, 5000)
                })
        })
        downloadPopupButtonDiv.appendChild(downloadPopupButton)

        // Buttons
        const buttonDiv = document.createElement("div")
        buttonDiv.style.width = "fit-content"
        buttonDiv.style.marginLeft = "auto"
        buttonDiv.style.display = "flex"
        buttonDiv.style.justifyItems = "right"
        buttonDiv.style.gap = "8px"
        div.appendChild(buttonDiv)

        let toggle = await getSetting("setting-open-tool")

        const toggleButtonDiv = document.createElement("div")
        toggleButtonDiv.style.display = "flex"
        toggleButtonDiv.style.borderColor = "#000000"
        toggleButtonDiv.style.borderWidth = "1px"
        toggleButtonDiv.style.borderStyle = "solid"
        toggleButtonDiv.style.borderRadius = "6px"
        toggleButtonDiv.style.backgroundColor = "#0945A0"
        toggleButtonDiv.style.opacity = "0.75"
        buttonDiv.appendChild(toggleButtonDiv)

        const toggleButton = document.createElement("button")
        makeButton(toggleButton, ">", false)
        toggleButton.style.borderColor = "transparent"
        toggleButton.style.backgroundColor = "transparent"
        toggleButton.style.borderWidth = "0px"
        toggleButton.style.borderRadius = "0px"
        toggleButton.style.color = "#ffffff"
        toggleButton.addEventListener("click", () => {
            if (toggle) {
                if (showInspectPopup) {
                    div.removeChild(inspectPopup)
                    showInspectPopup = false
                }
                if (showDownloadPopup) {
                    div.removeChild(downloadPopup)
                    showDownloadPopup = false
                }
                buttonDiv.removeChild(pipButton)
                buttonDiv.removeChild(inspectButton)
                buttonDiv.removeChild(downloadButton)
                toggleButton.textContent = "<"
            } else {
                buttonDiv.appendChild(pipButton)
                buttonDiv.appendChild(inspectButton)
                buttonDiv.appendChild(downloadButton)
                toggleButton.textContent = ">"
            }
            toggle = !toggle
        })
        toggleButtonDiv.appendChild(toggleButton)

        const toggleButtonDivider = document.createElement("div")
        toggleButtonDivider.style.width = "1px"
        toggleButtonDivider.style.alignSelf = "stretch"
        toggleButtonDivider.style.backgroundColor = "#000000"
        toggleButtonDiv.appendChild(toggleButtonDivider)

        const closeButton = document.createElement("button")
        makeButton(closeButton, "X", false)
        closeButton.style.borderColor = "transparent"
        closeButton.style.backgroundColor = "transparent"
        closeButton.style.borderWidth = "0px"
        closeButton.style.borderRadius = "0px"
        closeButton.style.color = "#ffffff"
        closeButton.addEventListener("click", () => {
            if (showInspectPopup) {
                div.removeChild(inspectPopup)
                showInspectPopup = false
            }
            if (showDownloadPopup) {
                div.removeChild(downloadPopup)
                showDownloadPopup = false
            }
            div.removeChild(buttonDiv)
        })
        toggleButtonDiv.appendChild(closeButton)

        const pipButton = document.createElement("button")
        makeButton(pipButton, "PiP", true)
        pipButton.addEventListener("click", () => { requestPip() })
        if (toggle) buttonDiv.appendChild(pipButton)

        const inspectButton = document.createElement("button")
        makeButton(inspectButton, "분석", true)
        inspectButton.addEventListener("click", () => {
            if (showInspectPopup) div.removeChild(inspectPopup)
            else {
                if (showDownloadPopup) {
                    div.removeChild(downloadPopup)
                    showDownloadPopup = false
                }
                div.appendChild(inspectPopup)
            }
            showInspectPopup = !showInspectPopup
        })
        if (toggle) buttonDiv.appendChild(inspectButton)

        const downloadButton = document.createElement("button")
        makeButton(downloadButton, "다운로드", true)
        downloadButton.addEventListener("click", () => {
            if (showDownloadPopup) div.removeChild(downloadPopup)
            else {
                if (showInspectPopup) {
                    div.removeChild(inspectPopup)
                    showInspectPopup = false
                }
                div.appendChild(downloadPopup)
            }
            showDownloadPopup = !showDownloadPopup
        })
        if (toggle) buttonDiv.appendChild(downloadButton)

        document.body.appendChild(div)

        log(`UI Load Ended`)
    }
})() // IIFE
