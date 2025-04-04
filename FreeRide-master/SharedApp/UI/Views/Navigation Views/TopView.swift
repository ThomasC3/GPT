//
//  TopView.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/25/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol TopViewDelegate: AnyObject {
    func didPressTopLeftButton(in view: TopView, style: Button.TopNavigationStyle, action: Button.TopNavigationAction)
    func didPressTopRightButton(in view: TopView, style: Button.TopNavigationStyle, action: Button.TopNavigationAction)
}

class TopView: UIView {
    
    @IBOutlet weak var verticalStackView: UIStackView!
    @IBOutlet weak var horizontalStackView: UIStackView!
    @IBOutlet weak var titleLabel: Label!
    @IBOutlet weak var leftNavigationButton: Button!
    @IBOutlet weak var rightNavigationButton: Button!
    
    /// Default height of 72
    @IBOutlet weak var stackViewHeight: NSLayoutConstraint?
    
    weak var delegate: TopViewDelegate?
    
    var title: String? {
        get { return titleLabel.text }
        set { titleLabel.text = newValue }
    }
    
    var leftNavigationStyle: Button.TopNavigationStyle = .none {
        didSet {
            updateLeftNavigationStyle()
        }
    }
    
    var rightNavigationStyle: Button.TopNavigationStyle = .none {
        didSet {
            updateRightNavigationStyle()
        }
    }
    
    var leftNavigationAction: Button.TopNavigationAction = .none
    var rightNavigationAction: Button.TopNavigationAction = .none
    
    override func awakeFromNib() {
        super.awakeFromNib()
        
        titleLabel.style = .titleNavigation

        updateLeftNavigationStyle()
        updateRightNavigationStyle()
        
        leftNavigationButton.accessibilityIdentifier = "leftNavigationButton"
        rightNavigationButton.accessibilityIdentifier = "rightNavigationButton"
        
        leftNavigationButton.tintColor = Theme.Colors.blueGray
        rightNavigationButton.tintColor = Theme.Colors.blueGray
    }
    
    @IBAction private func handleLeftNavigationAction() {
        delegate?.didPressTopLeftButton(in: self, style: leftNavigationStyle, action: leftNavigationAction)
    }
    
    @IBAction private func handleRightNavigationAction() {
        delegate?.didPressTopRightButton(in: self, style: rightNavigationStyle, action: rightNavigationAction)
    }
    
    func resetWith(leftButton: UIView?, titleView: UIView?, rightButton: UIView?) {
        horizontalStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        [leftButton, titleView, rightButton].compactMap({ $0 }).forEach { horizontalStackView?.addArrangedSubview($0) }
    }

    private func updateLeftNavigationStyle() {
        leftNavigationButton.updateImage(with: leftNavigationStyle)
    }

    private func updateRightNavigationStyle() {
        rightNavigationButton.updateImage(with: rightNavigationStyle)

        switch rightNavigationStyle {
        case .none:
            rightNavigationButton.isHidden = true
        default:
            rightNavigationButton.isHidden = false
        }
    }
}

extension Button {
    
    enum TopNavigationStyle {
        case none
        case back
        case backWhite
        case close
        case closeWhite
        case custom(UIImage?)
    }
    
    enum TopNavigationAction {
        case none
        case pop(Bool)
        case dismiss(Bool)
        case toggleMenu
        case custom(() -> Void)
    }
    
    func updateImage(with style: TopNavigationStyle) {
        switch style {
        case .back:
            setImage(#imageLiteral(resourceName: "round_keyboard_backspace_black_48pt"), for: .normal)
        case .backWhite:
            setImage(#imageLiteral(resourceName: "round_keyboard_backspace_black_48pt"), for: .normal)
        case .close:
            setImage(#imageLiteral(resourceName: "round_keyboard_backspace_black_48pt"), for: .normal)
        case .closeWhite:
            setImage(#imageLiteral(resourceName: "round_keyboard_backspace_black_48pt"), for: .normal)
        case .custom(let image):
            setImage(image, for: .normal)
        case .none:
            setImage(nil, for: .normal)
        }
    }
}
