//
//  LegalViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 1/9/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import WebKit

class LegalViewController: StackViewController {

    enum LegalType {
        case conduct
        case privacy
        case terms
        case faq
        case pwyw
        case contact
        case about
        case advertise
        case quoteInfo

        var title: String {
            switch self {
            case .conduct:
                return "settings_conduct".localize()
            case .privacy:
                return "Privacy Policy".localize()
            case .terms:
                return "Terms & Conditions".localize()
            case .faq:
                return "settings_faq_title".localize()
            case .pwyw:
                return "settings_pwyw_title".localize()
            case .contact:
                return "settings_contact".localize()
            case .about:
                return "settings_about".localize()
            case .advertise:
                return "settings_advertise".localize()
            case .quoteInfo:
                return ""
            }
        }
        
        var url: URL? {
            switch self {
            case .conduct:
                return URL(string: "https://ridecircuit.com/conduct/")
            case .privacy:
                return URL(string: "https://ridecircuit.com/privacy/")
            case .terms:
                return URL(string: "https://ridecircuit.com/terms/")
            case .faq:
                return URL(string: "https://ridecircuit.com/faq/")
            case .pwyw:
                return URL(string: "https://ridecircuit.com/circuit-collective/")
            case .contact:
                return URL(string: "https://ridecircuit.com/app-contact/")
            case .about:
                return URL(string: "https://ridecircuit.com/about-us/")
            case .advertise:
                return URL(string: "https://ridecircuit.com/advertise/")
            case .quoteInfo:
                return URL(string: "https://www.ridecircuit.com/help/payment-in-the-circuit-app/")
            }
        }
    }

    private let versionLabel: Label = {
        let label = Label()
        label.style = .body1darkgray
        label.text = "Version \(Bundle.versionString ?? "1.0") Build \(Bundle.buildString ?? "1")"
        label.constrainHeight(24)
        label.textAlignment = .center

        return label
    }()

    var type: LegalType = .terms

    private let webView: WKWebView = {
        let web = WKWebView()
        web.allowsLinkPreview = false
        web.backgroundColor = .gray

        return web
    }()

    override func viewDidLoad() {
        leftNavigationStyle = .back

        if navigationController != nil {
            leftNavigationAction = .pop(true)
        } else {
            leftNavigationAction = .dismiss(true)
        }

        title = type.title

        super.viewDidLoad()

        guard let url = type.url else {
            return
        }

        let request = URLRequest(url: url)
        webView.load(request);
        
        middleStackView.addArrangedSubview(webView)
        webView.pinHorizontalEdges(to: middleStackView)

        middleStackView.addArrangedSubview(versionLabel)
        versionLabel.pinHorizontalEdges(to: middleStackView)
    }
}

extension Bundle {

    public static var versionString: String? {
        return Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
    }

    public static var buildString: String? {
        return Bundle.main.infoDictionary?[kCFBundleVersionKey as String] as? String
    }
}
