//
//  RuntimeDebuggerViewController.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 22/08/2022.
//  Copyright © 2022 Circuit. All rights reserved.
//

import UIKit
import MessageUI
import OSLog

class RuntimeDebuggerViewController: TableViewController, UITableViewDelegate, UITableViewDataSource {

    private enum Section: CaseIterable {
        case apns
        case webSocketLogsOptions
        case webSocketLogsEntries
    }

    private enum SectionAPNS: CaseIterable {
        case deviceToken
        case deviceTokenRegistrationFailures
        case deviceEnvironment
    }

    private enum SectionWebSocketLogsOptions: CaseIterable {
        case status
        case connect
        case disconnect
        case refresh
        case exportMail
        case exportShareSheet
    }

    // Cache
    private var webSocketLogs: [String] = []

    override func viewDidLoad() {
        leftNavigationStyle = .custom(#imageLiteral(resourceName: "round_menu_black_48pt"))
        leftNavigationAction = .toggleMenu
        title = "Debugger"
        webSocketLogs = Socket.runtimeLogger?.getLogs() ?? []
        super.viewDidLoad()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        webSocketLogs = Socket.runtimeLogger?.getLogs() ?? []
        tableView.reloadData()
    }

    override func initializeTableView() {
        super.initializeTableView()
        tableView.delegate = self
        tableView.dataSource = self
        tableView.estimatedRowHeight = UITableView.automaticDimension
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "WebSocketLogEntry")
    }

    func numberOfSections(in tableView: UITableView) -> Int {
        return Section.allCases.count
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        switch Section.allCases[section] {
        case .apns:
            return SectionAPNS.allCases.count
        case .webSocketLogsOptions:
            return SectionWebSocketLogsOptions.allCases.count
        case .webSocketLogsEntries:
            return webSocketLogs.count
        }
    }

    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        switch Section.allCases[section] {
        case .apns:
            return "APNS"
        case .webSocketLogsOptions:
            return "WebSockets"
        case .webSocketLogsEntries:
            return "WebSocket Recent Logs"
        }
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        switch Section.allCases[indexPath.section] {
        case .apns:
            switch SectionAPNS.allCases[indexPath.row] {
            case .deviceToken:
                let cell = UITableViewCell(style: .subtitle, reuseIdentifier: nil)
                cell.textLabel?.text = "Device Token"
                cell.textLabel?.textColor = .systemBlue
                cell.textLabel?.numberOfLines = 0
                cell.detailTextLabel?.text = Defaults.deviceToken ?? "none"
                cell.detailTextLabel?.numberOfLines = 0
                return cell
            case .deviceTokenRegistrationFailures:
                let cell = UITableViewCell(style: .value2, reuseIdentifier: nil)
                cell.textLabel?.text = "Device Token Registration Failure"
                cell.textLabel?.numberOfLines = 0
                cell.detailTextLabel?.text = Defaults.deviceTokenRegistrationFailure ?? "none"
                cell.detailTextLabel?.numberOfLines = 0
                return cell
            case .deviceEnvironment:
                let cell = UITableViewCell(style: .value2, reuseIdentifier: nil)
                cell.textLabel?.text = "Environment"
                cell.textLabel?.numberOfLines = 0
                #if DEBUG
                cell.detailTextLabel?.text = "debug (Xcode)"
                #else
                cell.detailTextLabel?.text = "release (TestFlight/AppStore)"
                #endif
                cell.detailTextLabel?.numberOfLines = 0
                return cell
            }
        case .webSocketLogsOptions:
            switch SectionWebSocketLogsOptions.allCases[indexPath.row] {
            case .exportMail:
                let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
                cell.textLabel?.text = "Send logs using email"
                cell.textLabel?.textColor = .systemOrange
                return cell
            case .exportShareSheet:
                let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
                cell.textLabel?.text = "Share logs file"
                cell.textLabel?.textColor = .systemOrange
                return cell
            case .status:
                let cell = UITableViewCell(style: .subtitle, reuseIdentifier: nil)
                cell.textLabel?.text = "Socket status: \(context.socket.client.status)"
                cell.detailTextLabel?.text = "Device is reachable: \(Connectivity.sharedManager.isReachable)"
                return cell
            case .connect:
                let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
                cell.textLabel?.text = "Connect socket"
                cell.textLabel?.textColor = .systemBlue
                return cell
            case .disconnect:
                let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
                cell.textLabel?.text = "Disconnect socket"
                cell.textLabel?.textColor = .systemBlue
                return cell
            case .refresh:
                let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
                cell.textLabel?.text = "Refresh logs"
                cell.textLabel?.textColor = .systemBlue
                return cell
            }
        case .webSocketLogsEntries:
            let cell = tableView.dequeueReusableCell(withIdentifier: "WebSocketLogEntry", for: indexPath)
            cell.textLabel?.text = webSocketLogs[indexPath.row]
            cell.textLabel?.numberOfLines = 0
            return cell
        }
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        switch Section.allCases[indexPath.section] {
        case .apns:
            switch SectionAPNS.allCases[indexPath.row] {
            case .deviceToken:
                if let deviceToken = Defaults.deviceToken {
                    UIPasteboard.general.string = deviceToken
                }
            case .deviceTokenRegistrationFailures:
                if let errorMessage = Defaults.deviceTokenRegistrationFailure {
                    UIPasteboard.general.string = errorMessage
                }
            case .deviceEnvironment:
                // Do nothing
                break
            }
        case .webSocketLogsOptions:
            let diagnostics = webSocketLogs.joined(separator: "\n")

            switch SectionWebSocketLogsOptions.allCases[indexPath.row] {
            case .exportMail:
                if MFMailComposeViewController.canSendMail() {
                    let mailComposeViewController = MFMailComposeViewController()
                    mailComposeViewController.mailComposeDelegate = self
                    mailComposeViewController.setSubject("Circuit Support - WebSocket Logs")
                    mailComposeViewController.setToRecipients(["ricardo@whitesmith.co"])

                    if let diagnosticsData = diagnostics.data(using: .utf8) {
                        mailComposeViewController.setMessageBody("Tell us what happened:", isHTML: false)
                        mailComposeViewController.addAttachmentData(diagnosticsData, mimeType: "text/plain", fileName: "websocket_logs.txt")
                    }
                    else {
                        mailComposeViewController.setMessageBody(diagnostics, isHTML: false)
                    }

                    present(mailComposeViewController, animated: true, completion: nil)
                }
                else {
                    let alertController = UIAlertController(title: "Mail Composer", message: "No mail account is set up or mail app is not available or mail option is disabled in Settings.", preferredStyle: .alert)
                    alertController.addAction(UIAlertAction(title: "Ok", style: .cancel, handler: nil))
                    present(alertController, animated: true, completion: nil)
                }
            case .exportShareSheet:
                if let diagnosticsData = diagnostics.data(using: .utf8),
                   let diagnosticsFileURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first?.appendingPathComponent("websocket_logs.txt") {
                    print(diagnosticsFileURL)
                    do {
                        try diagnosticsData.write(to: diagnosticsFileURL, options: .atomic)
                    }
                    catch {
                        let alertController = UIAlertController(title: "WebSocket Logs", message: "Exporting logs failed: \(error.localizedDescription)", preferredStyle: .alert)
                        alertController.addAction(UIAlertAction(title: "Ok", style: .cancel, handler: nil))
                        present(alertController, animated: true, completion: nil)
                    }
                    // Share sheet
                    let activityViewController = UIActivityViewController(activityItems: [diagnosticsFileURL], applicationActivities: nil)
                    present(activityViewController, animated: true, completion: nil)
                }
            case .status:
                break
            case .connect:
                context.socket.connect()
                tableView.reloadData()
            case .disconnect:
                context.socket.disconnect()
                tableView.reloadData()
            case .refresh:
                webSocketLogs = Socket.runtimeLogger?.getLogs() ?? []
                tableView.reloadData()
            }
        case .webSocketLogsEntries:
            //UIPasteboard.general.string = webSocketLogs[indexPath.row]
            break
        }
    }

}

extension RuntimeDebuggerViewController: MFMailComposeViewControllerDelegate {

    func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
        switch result {
        case .sent:
            print("Update app: email sent")
        case .saved:
            print("Update app: email saved as draft")
        case .cancelled:
            print("Update app: email cancelled")
        case .failed:
            print("Update app: email failed:", error?.localizedDescription ?? "unknown")
        default:
            fatalError("MFMailComposeResult.\(result) not implemented")
        }
        controller.dismiss(animated: true, completion: nil)
    }

}
