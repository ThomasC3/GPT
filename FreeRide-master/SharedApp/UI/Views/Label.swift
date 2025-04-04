//
//  Label.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol LabelDelegate: AnyObject {

    func handleTapRecognizer(in label: Label)
}

class Label: UILabel {

    enum Style {
        case title1bluegray
        case title2white
        case title2bluegray
        case title3bluegray
        case title4white
        case subtitle1darkgray
        case subtitle1gray
        case subtitle1white
        case subtitle1bluegray
        case subtitle1lightred
        case subtitle1teal
        case subtitle2blue
        case subtitle2darkgray
        case subtitle2tangerine
        case subtitle2bluegray
        case subtitle2gray
        case subtitle3darkgray
        case subtitle3bluegray
        case subtitle8bluegray
        case subtitle3blue
        case subtitle6blue
        case subtitle1blue
        case subtitle4white
        case subtitle4lightred
        case subtitle4locationgray
        case subtitle5white
        case subtitle6bluegray
        case subtitle7bluegray
        case body1darkgray
        case body2darkgray
        case body2bluegray
        case body2tangerine
        case body3darkgray
        case body3bluegray
        case body3seafoam
        case body4bluegray
        case body5darkgray
        case body5bluegray
        case body5seafoam
        case titleNavigation
        case stepperTitle
        case menuItemTitle
        case menuToggleItemTitle
        case tag
    }

    var style: Style? {
        didSet {
            updateStyle()
        }
    }

    weak var delegate: LabelDelegate? {
        didSet {
            isUserInteractionEnabled = delegate != nil
        }
    }

    @IBInspectable
    public var edgeInsets: UIEdgeInsets = .zero {
        didSet {
            self.invalidateIntrinsicContentSize()
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        initialize()
    }

    convenience init() {
        self.init(frame: .zero)
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        initialize()
    }

    private func initialize() {
        adjustsFontSizeToFitWidth = true
        isUserInteractionEnabled = delegate != nil

        let tapRecognizer = UITapGestureRecognizer(target: self, action: #selector(handleTap))
        tapRecognizer.numberOfTapsRequired = 1
        addGestureRecognizer(tapRecognizer)
    }

    @objc private func handleTap() {
        delegate?.handleTapRecognizer(in: self)
    }

    private func updateStyle() {
        guard let style = style else {
            return
        }

        switch style {
        case .title1bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.title1!)
        case .title2white:
            textColor = Theme.Colors.white
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.title2!)
        case .title2bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.title2!)
        case .title3bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.title3!)
        case .title4white:
            textColor = Theme.Colors.white
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.title4!)
        case .subtitle1darkgray:
            textColor = Theme.Colors.darkGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle1!)
        case .subtitle1gray:
            textColor = Theme.Colors.gray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle1!)
        case .subtitle1white:
            textColor = Theme.Colors.white
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle1!)
        case .subtitle1bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle1!)
        case .subtitle1lightred:
            textColor = Theme.Colors.lightRed
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle1!)
        case .subtitle1teal:
            textColor = Theme.Colors.seaFoam
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle1!)
        case .subtitle2blue:
            textColor = Theme.Colors.seaFoam
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle2!)
        case .subtitle2darkgray:
            textColor = Theme.Colors.darkGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle2!)
        case .subtitle2tangerine:
            textColor = Theme.Colors.tangerine
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle2!)
        case .subtitle2bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle2!)
        case .subtitle2gray:
            textColor = Theme.Colors.gray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle2!)
        case .subtitle3bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle3!)
        case .subtitle3darkgray:
            textColor = Theme.Colors.darkGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle3!)
        case .subtitle8bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle8!)
        case .subtitle3blue:
            textColor = Theme.Colors.seaFoam
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle3!)
        case .subtitle6blue:
            textColor = Theme.Colors.seaFoam
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle6!)
        case .subtitle1blue:
            textColor = Theme.Colors.seaFoam
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle1!)
        case .subtitle4white:
            textColor = Theme.Colors.white
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle4!)
        case .subtitle4lightred:
            textColor = Theme.Colors.lightRed
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle4!)
        case .subtitle4locationgray:
            textColor = Theme.Colors.locationGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle4!)
        case .subtitle5white:
            textColor = Theme.Colors.white
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle5!)
        case .subtitle6bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle6!)
        case .subtitle7bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.subtitle7!)
        case .body1darkgray:
            textColor = Theme.Colors.darkGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body1!)
        case .body2darkgray:
            textColor = Theme.Colors.darkGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body2!)
        case .body2bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body2!)
        case .body2tangerine:
            textColor = Theme.Colors.tangerine
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body3!)
        case .body3darkgray:
            textColor = Theme.Colors.darkGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body3!)
        case .body3bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body3!)
        case .body3seafoam:
            textColor = Theme.Colors.seaFoam
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body3!)
        case .body4bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body4!)
        case .body5darkgray:
            textColor = Theme.Colors.darkGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body5!)
        case .body5bluegray:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body5!)
        case .body5seafoam:
            textColor = Theme.Colors.seaFoam
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body5!)
        case .titleNavigation:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.titleNavigation!)
            textAlignment = .right
        case .stepperTitle:
            textColor = Theme.Colors.darkGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.stepperTitle!)
            textAlignment = .center
        case .menuItemTitle:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.menuItemTitle!)
        case .menuToggleItemTitle:
            textColor = Theme.Colors.blueGray
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.menuToggleItemTitle!)
        case .tag:
            textColor = Theme.Colors.kelp
            font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.body6!)
        }
        
        self.adjustsFontForContentSizeCategory = true
    }

    override func textRect(forBounds bounds: CGRect, limitedToNumberOfLines numberOfLines: Int) -> CGRect {
        var rect = super.textRect(forBounds: bounds.inset(by: edgeInsets), limitedToNumberOfLines: numberOfLines)

        rect.origin.x -= edgeInsets.left
        rect.origin.y -= edgeInsets.top
        rect.size.width  += (edgeInsets.left + edgeInsets.right);
        rect.size.height += (edgeInsets.top + edgeInsets.bottom);

        return rect
    }

    override func drawText(in rect: CGRect) {
        super.drawText(in: rect.inset(by: edgeInsets))
    }
    
    func countLines() -> Int {
        guard let myText = self.text as NSString? else {
            return 0
        }
        self.layoutIfNeeded()
        let rect = CGSize(width: self.bounds.width, height: CGFloat.greatestFiniteMagnitude)
        let labelSize = myText.boundingRect(with: rect, options: .usesLineFragmentOrigin, attributes: [NSAttributedString.Key.font: self.font as Any], context: nil)
        return Int(ceil(CGFloat(labelSize.height) / self.font.lineHeight))
    }

}
