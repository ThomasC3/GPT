//
//  AdCarouselView.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 23/01/2025.
//  Copyright © 2025 Circuit. All rights reserved.
//

import SwiftUI
import Nuke
import NukeUI
import NukeExtensions

struct AdCarouselView: View {

    // MARK: - Properties

    let ads: [Advertisement]
    let onAdClicked: (Advertisement, Int, Int) -> Void
    let onAdViewed: (Advertisement, Int, Int) -> Void
    @State private var currentIndex = 0
    @State private var timer: Timer? = nil
    private let autoAdvanceInterval: TimeInterval = 5

    // MARK: - Init

    init(ads: [Advertisement], onAdClicked: @escaping (Advertisement, Int, Int) -> Void, onAdViewed: @escaping (Advertisement, Int, Int) -> Void) {
        self.ads = Array(ads.prefix(6)) // Limit to 6 ads
        self.onAdClicked = onAdClicked
        self.onAdViewed = onAdViewed
    }

    // MARK: - Body

    var body: some View {
        TabView(selection: $currentIndex) {
            ForEach(Array(ads.enumerated()), id: \.element.id) { index, ad in
                AdView(
                    ad: ad,
                    adIndex: index,
                    totalAds: ads.count,
                    onAdClicked: onAdClicked,
                    onAdViewed: onAdViewed
                )
                    .tag(index)
                    .onAppear {
                        onAdViewed(ad, index, ads.count)
                    }
            }
        }
        .tabViewStyle(.page)
        .frame(maxWidth: .infinity)
        .aspectRatio(16/9, contentMode: .fit)
        .padding(.horizontal, 20)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .background(.white)
        .onChange(of: currentIndex) { newIndex in
            setupTimer()
        }
        .onAppear {
            setupTimer()
        }
        .onDisappear {
            invalidateTimer()
        }
    }

    // MARK: - Private Methods

    private func setupTimer() {
        invalidateTimer()
        
        guard ads.count > 1 else { return }
        
        timer = Timer.scheduledTimer(withTimeInterval: autoAdvanceInterval, repeats: false) { _ in
            withAnimation {
                currentIndex = (currentIndex + 1) % ads.count
            }
        }
    }

    private func invalidateTimer() {
        timer?.invalidate()
        timer = nil
    }
}

// MARK: - Individual Ad View

private struct AdView: View {
    let ad: Advertisement
    let adIndex: Int
    let totalAds: Int
    let onAdClicked: (Advertisement, Int, Int) -> Void
    let onAdViewed: (Advertisement, Int, Int) -> Void

    var body: some View {
        SwiftUI.Button(action: {
            if UIApplication.shared.canOpenURL(ad.redirectUrl) {
                UIApplication.shared.open(ad.redirectUrl)
            }
            onAdClicked(ad, adIndex, totalAds)
        }) {
            LazyImage(url: ad.imageUrl) { state in
                if let image = state.image {
                    image
                        .resizable()
                        .aspectRatio(16/9, contentMode: .fill)
                } else if state.error != nil {
                    ErrorView()
                } else {
                    ProgressView()
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}

struct Advertisement: Identifiable, Equatable {
    var id: String?
    let imageUrl: URL
    let redirectUrl: URL
    let campaignId: String
    let mediaId: String
    let advertiserId: String
    let featured: Bool

    init(imageUrl: URL, redirectUrl: URL, campaignId: String, mediaId: String, advertiserId: String, featured: Bool) {
        self.id = mediaId
        self.imageUrl = imageUrl
        self.redirectUrl = redirectUrl
        self.campaignId = campaignId
        self.mediaId = mediaId
        self.advertiserId = advertiserId
        self.featured = featured
    }
}

private struct ErrorView: View {

    var body: some View {
        VStack {
            Image(systemName: "exclamationmark.triangle")
                .foregroundColor(.red)
            Text("Failed to load image")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: 150)
        .background(Color.gray.opacity(0.1))
        .cornerRadius(8)
    }
}
