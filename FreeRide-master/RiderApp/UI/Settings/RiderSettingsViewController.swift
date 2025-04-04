//
//  RiderSettingsViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/24/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

extension Notification.Name {
    static let didLogout = Notification.Name("didLogout")
}

class RiderSettingsViewController: SettingsViewController {

    private let faqID = "faq"
    private let termsID = "tos"
    private let privacyID = "privacy"
    private let conductID = "conduct"
    private let accessibilityID = "accessibility"
    private let logoutID = "logout"
    private let aboutID = "about"
    private let adverstiseID = "adverstise"

    override func viewDidLoad() {
        leftNavigationStyle = .custom(#imageLiteral(resourceName: "round_menu_black_48pt"))
        leftNavigationAction = .toggleMenu

        title = "menu_more_options".localize()

        super.viewDidLoad()
    }

    override func initializeTableView() {
        super.initializeTableView()

        tableView.delegate = self

        dataSource.items = [
            SettingsItem(id: faqID, image: #imageLiteral(resourceName: "round_contact_support_black_36pt"), title: "menu_faq".localize()),
            SettingsItem(id: aboutID, image: #imageLiteral(resourceName: "round_info_black_36pt"), title: "settings_about".localize()),
            SettingsItem(id: adverstiseID, image: #imageLiteral(resourceName: "round_show_chart_black_36pt"), title: "settings_advertise".localize()),
            SettingsItem(id: conductID, image: #imageLiteral(resourceName: "round_library_books_black_36pt"), title: "settings_conduct".localize()),
            SettingsItem(id: privacyID, image: #imageLiteral(resourceName: "round_library_books_black_36pt"), title: "settings_privacy".localize()),
            SettingsItem(id: termsID, image: #imageLiteral(resourceName: "round_library_books_black_36pt"), title: "settings_terms".localize())
        ]
    
        dataSource.refresh()
        tableView.reloadData()
    }
}

extension RiderSettingsViewController: UITableViewDelegate {

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let item = dataSource.value(at: indexPath)

        let vc = LegalViewController()
        switch item.id {
        case conductID:
            vc.type = .conduct
        case privacyID:
            vc.type = .privacy
        case termsID:
            vc.type = .terms
        case faqID:
            vc.type = .faq
        case aboutID:
            vc.type = .about
        case adverstiseID:
            vc.type = .advertise
        default:
            break
        }
        navigationController?.pushViewController(vc, animated: true)
    }
    
}
