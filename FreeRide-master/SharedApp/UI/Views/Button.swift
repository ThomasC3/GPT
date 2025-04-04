//
//  Button.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/4/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class Button: UIButton {

    enum Style {
        case primary
        case secondary
        case tertiaryDark
        case tertiaryLight
        case email
        case google
        case apple
        case cancel
        case contact
    }

    var style: Style? {
        didSet {
            updateStyle()
        }
    }

    override var isEnabled: Bool {
        didSet {
            guard let style = style else {
                return
            }

            switch style {
            case .primary:
                backgroundColor = !isEnabled ? Theme.Colors.gray : Theme.Colors.seaFoam
            default:
                return
            }
        }
    }

    override var isSelected: Bool {
        didSet {
            guard let style = style else {
                return
            }

            switch style {
            case .primary:
                backgroundColor = isSelected ? Theme.Colors.gray : Theme.Colors.seaFoam
            default:
                return
            }
        }
    }

    private func updateStyle() {
        guard let style = style else {
            return
        }

        backgroundColor = .clear
        setTitleColor(.black, for: .normal)
        setImage(nil, for: .normal)
        titleLabel?.font = nil
        titleLabel?.textAlignment = .center
        cornerRadius = frame.size.height / 2
        borderWidth = 0
        borderColor = nil
        shadowColor = nil

        switch style {
        case .primary:
            backgroundColor = Theme.Colors.seaFoam
            setTitleColor(Theme.Colors.white, for: .normal)
            titleLabel?.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.buttonPrimary!)
        case .secondary:
            backgroundColor = Theme.Colors.white
            setTitleColor(Theme.Colors.seaFoam, for: .normal)
            setTitleColor(Theme.Colors.gray, for: .disabled)
            setTitleColor(Theme.Colors.blueGray, for: .selected)
            titleLabel?.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.buttonSecondary!)
        case .tertiaryDark, .tertiaryLight:
            setTitleColor(Theme.Colors.seaFoam, for: .normal)
            setTitleColor(Theme.Colors.gray, for: .disabled)
            titleLabel?.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.buttonTertiary!)
        case .email:
            backgroundColor = Theme.Colors.seaFoam
            setTitleColor(Theme.Colors.white, for: .normal)
            setTitleColor(Theme.Colors.gray, for: .disabled)
            setTitleColor(Theme.Colors.white, for: .selected)
            titleLabel?.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.buttonPrimary!)
            setImage(#imageLiteral(resourceName: "round_mail_outline_black_24pt"), for: .normal)
            imageView?.tintColor = Theme.Colors.white
            addShadow()
        case .google:
            backgroundColor = Theme.Colors.white
            setTitleColor(Theme.Colors.blueGray, for: .normal)
            setTitleColor(Theme.Colors.gray, for: .disabled)
            setTitleColor(Theme.Colors.darkGray, for: .selected)
            titleLabel?.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.buttonPrimary!)
            borderWidth = 1
            borderColor = Theme.Colors.lightGray.cgColor
            setImage(#imageLiteral(resourceName: "GoogleButton"), for: .normal)
            addShadow()
        case .apple:
            backgroundColor = Theme.Colors.white
            tintColor = .black
            setTitleColor(Theme.Colors.blueGray, for: .normal)
            setTitleColor(Theme.Colors.gray, for: .disabled)
            setTitleColor(Theme.Colors.darkGray, for: .selected)
            titleLabel?.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.buttonPrimary!)
            borderWidth = 1
            borderColor = Theme.Colors.lightGray.cgColor
            setImage(UIImage(systemName: "apple.logo"), for: .normal)
            addShadow()
        case .cancel:
            backgroundColor = Theme.Colors.white
            setTitleColor(Theme.Colors.seaFoam, for: .normal)
            borderWidth = 1
            borderColor = Theme.Colors.seaFoam.cgColor
            titleLabel?.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.buttonPrimary!)
        case .contact:
            backgroundColor = Theme.Colors.kelp
            setTitleColor(Theme.Colors.white, for: .normal)
            titleLabel?.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.buttonPrimary!)
        }
        titleLabel?.adjustsFontForContentSizeCategory = true
    }

    override func layoutSubviews() {
        super.layoutSubviews()

        cornerRadius = frame.size.height / 2
        guard let style = style,
            let imageViewWidth = imageView?.frame.width,
            let titleLabelWidth = titleLabel?.frame.width else {
            return
        }

        switch style {
        case .email, .google, .apple:
            break
        default:
            return
        }

        contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
        contentHorizontalAlignment = .left
        let availableSpace = bounds.inset(by: contentEdgeInsets)
        let availableWidth = availableSpace.width - imageEdgeInsets.right - imageViewWidth - titleLabelWidth
        titleEdgeInsets = UIEdgeInsets(top: 0, left: availableWidth / 2 - contentEdgeInsets.left, bottom: 0, right: 0)
    }

}
